/**
 * Identity resolution: map every source's way of naming a human to one canonical Person.
 * Rules are deliberately simple and explainable; every non-certain match carries a confidence
 * and ambiguous matches are NOT auto-merged — they surface in Data Quality for a human.
 */
import type { Company, IdentityRef, NormalizedEvent, Person, ResolvedEvent, Seniority } from "../contracts";

export type IdentityIssue = {
  id: string;
  kind: "ambiguous_identity" | "unmatched_identity" | "stale_identity";
  personId: string;
  detail: string;
  candidates: string[];
  eventId: string;
};

export type Directory = {
  companies: Map<string, Company>;
  people: Map<string, Person>;
  issues: IdentityIssue[];
};

const slug = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
export const companyIdForDomain = (domain: string) => `co_${slug(domain.split(".")[0]!)}`;
const personIdFor = (name: string, domain: string) => `per_${slug(name)}_${slug(domain.split(".")[0]!.split("-")[0]!)}`;
const normName = (s: string) => slug(s);

/** `merges`: human-confirmed handle → person decisions from the Data Quality screen. */
export function resolveIdentities(events: readonly NormalizedEvent[], merges: Record<string, string> = {}) {
  const companies = new Map<string, Company>();
  const people = new Map<string, Person>();
  const byEmail = new Map<string, string>();
  const byHandle = new Map<string, { id: string; confidence: number }>();
  const issues: IdentityIssue[] = [];
  const commentAuthors = new Map<string, string>();

  const companyByName = (name?: string) => {
    if (!name) return undefined;
    const n = normName(name);
    for (const c of companies.values()) if (normName(c.name) === n) return c;
    return undefined;
  };

  const ensureCompany = (domain: string, meta?: Partial<Company>) => {
    const id = companyIdForDomain(domain);
    const existing = companies.get(id);
    const next: Company = {
      id,
      domain,
      name: meta?.name ?? existing?.name ?? domain,
      industry: meta?.industry ?? existing?.industry ?? "Unknown",
      sizeBand: meta?.sizeBand ?? existing?.sizeBand ?? "unknown",
      isHome: meta?.isHome ?? existing?.isHome ?? false,
      isTarget: meta?.isTarget ?? existing?.isTarget ?? false,
    };
    companies.set(id, next);
    return next;
  };

  const linkHandle = (handle: string, personId: string, confidence: number) => {
    if (!byHandle.has(handle)) byHandle.set(handle, { id: personId, confidence });
    const p = people.get(personId);
    if (p && !p.handles.includes(handle)) p.handles.push(handle);
  };

  const resolveRef = (ref: IdentityRef | undefined, eventId: string): { id?: string; confidence: number } => {
    if (!ref) return { confidence: 1 };
    if (ref.kind === "email") {
      const email = ref.email.toLowerCase();
      const known = byEmail.get(email);
      if (known) return { id: known, confidence: 1 };
      // Unknown email: create a person from the address. Email is a strong identifier.
      const domain = email.split("@")[1]!;
      const company = ensureCompany(domain);
      const id = personIdFor(ref.name ?? email.split("@")[0]!, domain);
      people.set(id, { id, name: ref.name ?? email, title: "", email, handles: [], companyId: company.id, previousCompanyIds: [], seniority: "ic", isTeamMember: false, identityConfidence: 0.8 });
      byEmail.set(email, id);
      return { id, confidence: 0.8 };
    }
    const byH = byHandle.get(ref.handle);
    if (byH) return byH;
    const merged = merges[ref.handle];
    if (merged && people.has(merged)) {
      linkHandle(ref.handle, merged, 1);
      return { id: merged, confidence: 1 };
    }
    const candidates = [...people.values()].filter((p) => normName(p.name) === normName(ref.name));
    const company = companyByName(ref.companyName);
    if (company) {
      const match = candidates.filter((p) => p.companyId === company.id || p.previousCompanyIds.includes(company.id));
      if (match.length === 1) {
        linkHandle(ref.handle, match[0]!.id, 0.9);
        return { id: match[0]!.id, confidence: 0.9 };
      }
    } else if (candidates.length === 1) {
      linkHandle(ref.handle, candidates[0]!.id, 0.7);
      return { id: candidates[0]!.id, confidence: 0.7 };
    }
    // Ambiguous or unknown → provisional person. Never silently merge.
    const id = `per_h_${slug(ref.handle)}`;
    const ambiguous = candidates.length > 1;
    const confidence = ambiguous ? 0.35 : 0.5;
    people.set(id, { id, name: ref.name, title: "", handles: [ref.handle], companyId: company?.id, previousCompanyIds: [], seniority: "ic", isTeamMember: false, identityConfidence: confidence });
    byHandle.set(ref.handle, { id, confidence });
    issues.push({
      id: `iss_${id}`,
      kind: ambiguous ? "ambiguous_identity" : "unmatched_identity",
      personId: id,
      detail: ambiguous
        ? `Profile "${ref.handle}" (${ref.name}) matches ${candidates.length} known people and has no company. Needs a manual merge.`
        : `Profile "${ref.handle}" (${ref.name}) has no matching CRM contact.`,
      candidates: candidates.map((c) => c.id),
      eventId,
    });
    return { id, confidence };
  };

  const resolved: ResolvedEvent[] = [];
  for (const e of events) {
    const m = e.metadata;
    if (e.type === "company_upserted" && e.companyDomain) {
      ensureCompany(e.companyDomain, { name: String(m.name), industry: String(m.industry), sizeBand: String(m.sizeBand), isTarget: Boolean(m.isTarget) });
    }
    if (e.type === "person_upserted" && e.actor?.kind === "email" && e.companyDomain) {
      const company = ensureCompany(e.companyDomain, m.isTeamMember ? { isHome: true, name: String(m.companyName ?? e.companyDomain) } : undefined);
      const email = e.actor.email;
      const id = byEmail.get(email) ?? personIdFor(String(m.name), e.companyDomain);
      const prev = people.get(id);
      people.set(id, {
        id,
        name: String(m.name),
        title: String(m.title ?? prev?.title ?? ""),
        email,
        handles: prev?.handles ?? [],
        companyId: company.id,
        previousCompanyIds: prev?.previousCompanyIds ?? [],
        seniority: (m.seniority as Seniority) ?? prev?.seniority ?? "ic",
        isTeamMember: Boolean(m.isTeamMember),
        personaRole: m.personaRole ? (String(m.personaRole) as Person["personaRole"]) : prev?.personaRole,
        identityConfidence: 1,
      });
      byEmail.set(email, id);
      if (typeof m.handle === "string") linkHandle(m.handle, id, 1);
    }

    const actor = resolveRef(e.actor, e.id);
    const subject = resolveRef(e.subject, e.id);

    if (e.type === "person_changed_company" && actor.id) {
      const p = people.get(actor.id)!;
      const to = companyByName(String(m.toCompany));
      if (to && p.companyId !== to.id) {
        if (p.companyId) p.previousCompanyIds.push(p.companyId);
        p.companyId = to.id;
        issues.push({ id: `iss_stale_${p.id}`, kind: "stale_identity", personId: p.id, detail: `${p.name} moved to ${to.name}. CRM record still lists the previous employer.`, candidates: [], eventId: e.id });
      }
    }
    if (e.type === "person_commented_post" && actor.id && typeof m.commentId === "string") commentAuthors.set(m.commentId, actor.id);

    let subjectId = subject.id;
    if (e.type === "team_replied_comment" && typeof m.commentId === "string") subjectId = commentAuthors.get(m.commentId);

    const companyId = e.companyDomain
      ? companyIdForDomain(e.companyDomain)
      : subjectId && !people.get(subjectId)?.isTeamMember
        ? people.get(subjectId)?.companyId
        : actor.id && !people.get(actor.id)?.isTeamMember
          ? people.get(actor.id)?.companyId
          : undefined;

    const { actor: _a, subject: _s, ...rest } = e;
    void _a;
    void _s;
    resolved.push({ ...rest, actorId: actor.id, subjectId, companyId, identityConfidence: Math.min(actor.confidence, subject.confidence) });
  }

  // Meetings reference attendees by email inside metadata; resolve them to canonical IDs.
  for (const r of resolved) {
    if (r.type === "meeting_created" && typeof r.metadata.attendees === "string") {
      r.metadata = { ...r.metadata, attendeeIds: r.metadata.attendees.split(",").map((em) => byEmail.get(em) ?? "unknown").join(",") };
    }
    if (r.type === "introduction_made" && typeof r.metadata.to === "string") {
      r.metadata = { ...r.metadata, toId: byEmail.get(r.metadata.to) ?? null };
    }
  }

  const directory: Directory = { companies, people, issues };
  return { directory, resolved };
}
