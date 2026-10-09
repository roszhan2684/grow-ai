import { z } from "zod";

/* ───────────────────────── Providers & raw events ───────────────────────── */

export const ProviderSchema = z.enum(["csv_crm", "hubspot", "slack", "social", "manual"]);
export type Provider = z.infer<typeof ProviderSchema>;

export const RawEventStatusSchema = z.enum(["received", "normalized", "duplicate", "dead_letter"]);
export type RawEventStatus = z.infer<typeof RawEventStatusSchema>;

/** Exactly what a provider handed us. Persisted BEFORE normalization or graph projection. */
export const RawEventSchema = z.object({
  provider: ProviderSchema,
  providerEventId: z.string().min(1),
  kind: z.string().min(1),
  payload: z.record(z.string(), z.unknown()),
  receivedAt: z.string(),
});
export type RawEvent = z.infer<typeof RawEventSchema>;

export type StoredRawEvent = RawEvent & {
  id: string;
  hash: string;
  status: RawEventStatus;
  error?: string;
  duplicateOf?: string;
};

/* ───────────────────────── Identity ───────────────────────── */

/** How a source refers to a human. Providers never get to pick our canonical person IDs. */
export const IdentityRefSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("email"), email: z.string().email(), name: z.string().optional() }),
  z.object({
    kind: z.literal("profile"),
    handle: z.string(),
    name: z.string(),
    companyName: z.string().optional(),
  }),
]);
export type IdentityRef = z.infer<typeof IdentityRefSchema>;

/* ───────────────────────── Normalized events ───────────────────────── */

export const NormalizedTypeSchema = z.enum([
  "company_upserted",
  "person_upserted",
  "person_changed_company",
  "known_connection",
  "crm_contact_owner",
  "post_published",
  "person_liked_post",
  "person_commented_post",
  "team_replied_comment",
  "introduction_made",
  "meeting_created",
  "opportunity_opened",
  "opportunity_stage_changed",
  "revenue_closed_won",
  "draft_approved",
  "crm_note_created",
]);
export type NormalizedType = z.infer<typeof NormalizedTypeSchema>;

export const MetaValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
export type MetaValue = z.infer<typeof MetaValueSchema>;

export const NormalizedEventSchema = z.object({
  id: z.string(),
  type: NormalizedTypeSchema,
  occurredAt: z.string(),
  source: ProviderSchema,
  rawEventId: z.string(),
  actor: IdentityRefSchema.optional(),
  subject: IdentityRefSchema.optional(),
  objectId: z.string().optional(),
  companyDomain: z.string().optional(),
  metadata: z.record(z.string(), MetaValueSchema),
});
export type NormalizedEvent = z.infer<typeof NormalizedEventSchema>;

/** A normalized event after identity resolution: references are canonical IDs plus a confidence. */
export type ResolvedEvent = Omit<NormalizedEvent, "actor" | "subject"> & {
  actorId?: string;
  subjectId?: string;
  companyId?: string;
  identityConfidence: number;
};

/* ───────────────────────── Domain entities ───────────────────────── */

export type Seniority = "c_level" | "vp" | "director" | "manager" | "ic";
export type PersonaRole = "ceo" | "vp_sales" | "head_marketing";

export type Company = {
  id: string;
  name: string;
  domain: string;
  industry: string;
  sizeBand: string;
  isHome: boolean;
  isTarget: boolean;
};

export type Person = {
  id: string;
  name: string;
  title: string;
  email?: string;
  handles: string[];
  companyId?: string;
  previousCompanyIds: string[];
  seniority: Seniority;
  isTeamMember: boolean;
  personaRole?: PersonaRole;
  identityConfidence: number;
};

export type Post = {
  id: string;
  authorId: string;
  topic: string;
  title: string;
  publishedAt: string;
};

export type OpportunityStage = "discovery" | "evaluation" | "proposal" | "negotiation" | "closed_won" | "closed_lost";

export type Opportunity = {
  id: string;
  crmExternalId: string;
  companyId: string;
  name: string;
  stage: OpportunityStage;
  amount: number;
  openedAt: string;
  closedAt?: string;
};

export type Meeting = {
  id: string;
  companyId: string;
  attendeeIds: string[];
  title: string;
  occurredAt: string;
};

/* ───────────────────────── Typed outcomes ───────────────────────── */

/** Every side effect returns one of these — never throws across a boundary. */
export type Outcome<T> =
  | { kind: "success"; value: T }
  | { kind: "retryable_failure"; reason: string; retryAfterMs?: number }
  | { kind: "permanent_failure"; reason: string }
  | { kind: "approval_required"; reason: string; approvalId: string };

export const ok = <T>(value: T): Outcome<T> => ({ kind: "success", value });
