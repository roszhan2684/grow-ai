/**
 * Provider → domain normalization. This is the ONLY place provider-specific payload shapes exist.
 * Each normalizer validates with Zod; invalid payloads throw NormalizationError → dead letter.
 */
import { z } from "zod";
import type { IdentityRef, NormalizedEvent, StoredRawEvent } from "../contracts";
import { hashString } from "../lib/hash";

export class NormalizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NormalizationError";
  }
}

const Profile = z.object({ handle: z.string(), name: z.string(), company: z.string().optional() });
const profileRef = (p: z.infer<typeof Profile>): IdentityRef => ({ kind: "profile", handle: p.handle, name: p.name, companyName: p.company });
const emailRef = (email: string, name?: string): IdentityRef => ({ kind: "email", email: email.toLowerCase(), name });

type Draft = Omit<NormalizedEvent, "id" | "rawEventId" | "source" | "occurredAt"> & { occurredAt?: string };

function parse<T>(schema: z.ZodType<T>, payload: unknown, kind: string): T {
  const r = schema.safeParse(payload);
  if (!r.success) {
    const issue = r.error.issues[0];
    throw new NormalizationError(`${kind}: ${issue?.path.join(".") || "payload"} — ${issue?.message ?? "invalid"}`);
  }
  return r.data;
}

const normalizers: Record<string, (payload: unknown) => Draft[]> = {
  /* manual (org setup) */
  team_member: (raw) => {
    const p = parse(z.object({ email: z.string().email(), name: z.string(), title: z.string(), persona_role: z.enum(["ceo", "vp_sales", "head_marketing"]), handle: z.string(), company_domain: z.string(), company_name: z.string() }), raw, "team_member");
    return [{ type: "person_upserted", actor: emailRef(p.email, p.name), companyDomain: p.company_domain, metadata: { name: p.name, title: p.title, personaRole: p.persona_role, handle: p.handle, companyName: p.company_name, isTeamMember: true, seniority: p.persona_role === "head_marketing" ? "director" : p.persona_role === "ceo" ? "c_level" : "vp" } }];
  },

  /* csv_crm */
  account_row: (raw) => {
    const p = parse(z.object({ name: z.string().min(1), domain: z.string().min(3), industry: z.string().default("Unknown"), size_band: z.string().default("unknown"), is_target: z.union([z.boolean(), z.string()]).default(false) }), raw, "account_row");
    return [{ type: "company_upserted", companyDomain: p.domain.toLowerCase(), metadata: { name: p.name, industry: p.industry, sizeBand: p.size_band, isTarget: p.is_target === true || p.is_target === "true" } }];
  },
  contact_row: (raw) => {
    const p = parse(z.object({ email: z.string().email(), name: z.string().min(1), title: z.string().default(""), company_domain: z.string().min(3), seniority: z.enum(["c_level", "vp", "director", "manager", "ic"]).default("ic") }), raw, "contact_row");
    return [{ type: "person_upserted", actor: emailRef(p.email, p.name), companyDomain: p.company_domain.toLowerCase(), metadata: { name: p.name, title: p.title, seniority: p.seniority, isTeamMember: false } }];
  },

  /* hubspot */
  "contact.owner_assigned": (raw) => {
    const p = parse(z.object({ contactEmail: z.string().email(), ownerEmail: z.string().email() }), raw, "contact.owner_assigned");
    return [{ type: "crm_contact_owner", actor: emailRef(p.ownerEmail), subject: emailRef(p.contactEmail), metadata: {} }];
  },
  "meeting.created": (raw) => {
    const p = parse(z.object({ meetingId: z.string(), companyDomain: z.string(), title: z.string(), attendeeEmails: z.array(z.string().email()).min(2) }), raw, "meeting.created");
    return [{ type: "meeting_created", objectId: p.meetingId, companyDomain: p.companyDomain, metadata: { title: p.title, attendees: p.attendeeEmails.join(",") } }];
  },
  "deal.created": (raw) => {
    const p = parse(z.object({ dealId: z.string(), companyDomain: z.string(), name: z.string(), amount: z.number({ error: "amount must be a number" }).nonnegative(), stage: z.string() }), raw, "deal.created");
    return [{ type: "opportunity_opened", objectId: p.dealId, companyDomain: p.companyDomain, metadata: { name: p.name, amount: p.amount, stage: p.stage } }];
  },
  "deal.stage_changed": (raw) => {
    const p = parse(z.object({ dealId: z.string(), stage: z.enum(["discovery", "evaluation", "proposal", "negotiation", "closed_won", "closed_lost"]) }), raw, "deal.stage_changed");
    const out: Draft[] = [{ type: "opportunity_stage_changed", objectId: p.dealId, metadata: { stage: p.stage } }];
    if (p.stage === "closed_won") out.push({ type: "revenue_closed_won", objectId: p.dealId, metadata: {} });
    return out;
  },

  /* slack */
  "message.intro": (raw) => {
    const p = parse(z.object({ channel: z.string(), introducerEmail: z.string().email(), introducedEmail: z.string().email(), toEmail: z.string().email(), text: z.string() }), raw, "message.intro");
    return [{ type: "introduction_made", actor: emailRef(p.introducerEmail), subject: emailRef(p.introducedEmail), metadata: { to: p.toEmail.toLowerCase(), channel: p.channel, text: p.text } }];
  },

  /* social fixtures */
  "connection.known": (raw) => {
    const p = parse(z.object({ a: Profile, b: Profile }), raw, "connection.known");
    return [{ type: "known_connection", actor: profileRef(p.a), subject: profileRef(p.b), metadata: {} }];
  },
  "post.published": (raw) => {
    const p = parse(z.object({ postId: z.string(), author: Profile, title: z.string(), topic: z.string() }), raw, "post.published");
    return [{ type: "post_published", actor: profileRef(p.author), objectId: p.postId, metadata: { title: p.title, topic: p.topic } }];
  },
  "reaction.like": (raw) => {
    const p = parse(z.object({ postId: z.string(), actor: Profile }), raw, "reaction.like");
    return [{ type: "person_liked_post", actor: profileRef(p.actor), objectId: p.postId, metadata: {} }];
  },
  "comment.created": (raw) => {
    const p = parse(z.object({ postId: z.string(), commentId: z.string(), actor: Profile, text: z.string() }), raw, "comment.created");
    // Comment text is stored verbatim but flagged untrusted: it must never become an instruction.
    return [{ type: "person_commented_post", actor: profileRef(p.actor), objectId: p.postId, metadata: { commentId: p.commentId, text: p.text, untrusted: true } }];
  },
  "comment.reply": (raw) => {
    const p = parse(z.object({ postId: z.string(), commentId: z.string(), author: Profile }), raw, "comment.reply");
    return [{ type: "team_replied_comment", actor: profileRef(p.author), objectId: p.postId, metadata: { commentId: p.commentId } }];
  },
  "profile.company_changed": (raw) => {
    const p = parse(z.object({ person: Profile, toCompany: z.string() }), raw, "profile.company_changed");
    return [{ type: "person_changed_company", actor: profileRef(p.person), metadata: { toCompany: p.toCompany } }];
  },

  /* in-product actions recorded as events (approvals, CRM notes) */
  "draft.approved": (raw) => {
    const p = parse(z.object({ draftId: z.string(), approverEmail: z.string().email(), personaEmail: z.string().email(), title: z.string(), topic: z.string() }), raw, "draft.approved");
    const out: Draft[] = [
      { type: "draft_approved", actor: emailRef(p.approverEmail), objectId: p.draftId, metadata: { title: p.title } },
      { type: "post_published", actor: emailRef(p.personaEmail), objectId: p.draftId, metadata: { title: p.title, topic: p.topic } },
    ];
    return out;
  },
  "engagement.recorded": (raw) => {
    const p = parse(z.object({ postId: z.string(), actor: Profile, comment: z.string().optional() }), raw, "engagement.recorded");
    const out: Draft[] = p.comment
      ? [{ type: "person_commented_post", actor: profileRef(p.actor), objectId: p.postId, metadata: { commentId: `manual_${hashString(p.actor.handle + p.postId)}`, text: p.comment, untrusted: true } }]
      : [{ type: "person_liked_post", actor: profileRef(p.actor), objectId: p.postId, metadata: {} }];
    return out;
  },
  "crm.note_created": (raw) => {
    const p = parse(z.object({ contactEmail: z.string().email(), authorEmail: z.string().email(), body: z.string(), idempotencyKey: z.string() }), raw, "crm.note_created");
    return [{ type: "crm_note_created", actor: emailRef(p.authorEmail), subject: emailRef(p.contactEmail), metadata: { body: p.body, idempotencyKey: p.idempotencyKey } }];
  },
};

/** Occurred-at: use the provider's own timestamp field when present, else when we received it. */
export function normalizeRaw(raw: StoredRawEvent): NormalizedEvent[] {
  const fn = normalizers[raw.kind];
  if (!fn) throw new NormalizationError(`No normalizer for ${raw.provider}/${raw.kind}`);
  const occurredAt = typeof raw.payload.occurredAt === "string" ? raw.payload.occurredAt : raw.receivedAt;
  return fn(raw.payload).map((d, i) => ({
    ...d,
    id: `ne_${hashString(`${raw.id}:${i}`)}`,
    rawEventId: raw.id,
    source: raw.provider,
    occurredAt: d.occurredAt ?? occurredAt,
  }));
}

export const SUPPORTED_KINDS = Object.keys(normalizers);
