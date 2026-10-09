/**
 * Workspace = the full derived state of one org, computed from its raw event log.
 * INGEST → NORMALIZE → RESOLVE IDENTITY → BUILD GRAPH → DETECT SIGNALS → (RECOMMEND / ATTRIBUTE)
 * Pure and deterministic: same raw events + same clock ⇒ identical workspace and checksums.
 */
import type { Company, Meeting, Opportunity, OpportunityStage, Person, Post, RawEvent, ResolvedEvent } from "./contracts";
import { ingest, type IngestResult } from "./ingest/pipeline";
import { resolveIdentities } from "./identity/resolve";
import { graphChecksum, projectGraph, type Graph } from "./graph/project";
import { buildAdjacency, findWarmPaths, type WarmPath } from "./graph/warmPaths";
import { detectSignals, type Signal } from "./signals/detect";
import { attribute, type AttributionModel, type AttributionResult } from "./attribution/models";
import { defaultCampaigns, generateDrafts, type Campaign, type Draft } from "./content/engine";
import type { ConnectorStatus } from "./integrations/connector";
import { ageInDays, DEMO_NOW, formatDate } from "./lib/time";
import { hashString, stableStringify } from "./lib/hash";

export type IntegrationRecord = {
  provider: "csv_crm" | "hubspot" | "slack" | "social";
  displayName: string;
  mode: "live" | "mock" | "fixture";
  status: ConnectorStatus;
  scopes: string[];
  received: number;
  normalized: number;
  duplicates: number;
  deadLetters: number;
  lastSyncAt?: string;
  cursor: string;
  lastError?: string;
};

export type AccountSummary = {
  company: Company;
  people: Person[];
  engagement14d: number;
  engagement30d: number;
  engagedPeople30d: number;
  weekly: number[];
  warmth: number;
  opportunity?: Opportunity;
  bestPath?: WarmPath;
  lastTouchAt?: string;
  signals: Signal[];
};

export type WorkspaceOptions = {
  now?: number;
  /** When set, the graph is frozen at the first N raw events (simulated Neo4j outage). */
  graphFrozenAtRaw?: number;
  integrationOverrides?: Partial<Record<IntegrationRecord["provider"], Partial<IntegrationRecord>>>;
  /** Human-confirmed identity merges (handle → person id). */
  identityMerges?: Record<string, string>;
};

export type Workspace = ReturnType<typeof buildWorkspace>;

const ENGAGEMENT = new Set(["person_liked_post", "person_commented_post", "meeting_created", "introduction_made", "team_replied_comment"]);

export function buildWorkspace(rawEvents: readonly RawEvent[], opts: WorkspaceOptions = {}) {
  const now = opts.now ?? DEMO_NOW;
  const ing: IngestResult = ingest(rawEvents);
  const { directory, resolved } = resolveIdentities(ing.normalized, opts.identityMerges);
  const repairedDeadLetters = new Set(ing.raw.filter((r) => r.status === "normalized" && typeof r.payload.repairOf === "string").map((r) => String(r.payload.repairOf)));

  // Graph is derived. During a simulated outage we keep serving the last good projection.
  let graphEvents: ResolvedEvent[] = resolved;
  if (opts.graphFrozenAtRaw !== undefined) {
    const allowed = new Set(ing.raw.slice(0, opts.graphFrozenAtRaw).map((r) => r.id));
    graphEvents = resolved.filter((e) => allowed.has(e.rawEventId));
  }
  const graph = projectGraph(graphEvents, directory);
  const projectionLag = resolved.length - graphEvents.length;

  const eventById = new Map(resolved.map((e) => [e.id, e]));
  const rawById = new Map(ing.raw.map((r) => [r.id, r]));

  /* Read models */
  const posts: Post[] = [];
  const opportunities = new Map<string, Opportunity>();
  const meetings: Meeting[] = [];
  for (const e of resolved) {
    if (e.type === "post_published" && e.objectId && e.actorId)
      posts.push({ id: e.objectId, authorId: e.actorId, topic: String(e.metadata.topic), title: String(e.metadata.title), publishedAt: e.occurredAt });
    if (e.type === "opportunity_opened" && e.objectId && e.companyId)
      opportunities.set(e.objectId, { id: `opp_${e.objectId}`, crmExternalId: e.objectId, companyId: e.companyId, name: String(e.metadata.name), stage: String(e.metadata.stage) as OpportunityStage, amount: Number(e.metadata.amount), openedAt: e.occurredAt });
    if (e.type === "opportunity_stage_changed" && e.objectId) {
      const o = opportunities.get(e.objectId);
      if (o) opportunities.set(e.objectId, { ...o, stage: String(e.metadata.stage) as OpportunityStage, closedAt: String(e.metadata.stage).startsWith("closed") ? e.occurredAt : o.closedAt });
    }
    if (e.type === "meeting_created" && e.objectId && e.companyId)
      meetings.push({ id: e.objectId, companyId: e.companyId, attendeeIds: String(e.metadata.attendeeIds ?? "").split(","), title: String(e.metadata.title), occurredAt: e.occurredAt });
  }
  const opps = [...opportunities.values()];
  const postTopics = new Map(posts.map((p) => [p.id, p.topic]));

  const targets = [...directory.companies.values()].filter((c) => c.isTarget).sort((a, b) => a.name.localeCompare(b.name));
  const adjacency = buildAdjacency(graph);
  const warmPaths = new Map<string, WarmPath[]>(targets.map((c) => [c.id, findWarmPaths(graph, directory, resolved, c.id, { now, adjacency, limit: 12 })]));

  /* Integrations: health derived from what actually happened in ingestion */
  const integrations: IntegrationRecord[] = (
    [
      ["csv_crm", "CSV CRM import", "live", []],
      ["hubspot", "HubSpot", "mock", ["crm.objects.deals.read", "crm.objects.contacts.read"]],
      ["slack", "Slack", "fixture", ["channels:history", "channels:read"]],
      ["social", "Social engagement", "fixture", []],
    ] as const
  ).map(([provider, displayName, mode, scopes]) => {
    const rs = ing.raw.filter((r) => r.provider === provider);
    const dead = rs.filter((r) => r.status === "dead_letter" && !repairedDeadLetters.has(r.id));
    const base: IntegrationRecord = {
      provider,
      displayName,
      mode,
      status: "HEALTHY",
      scopes: [...scopes],
      received: rs.length,
      normalized: rs.filter((r) => r.status === "normalized").length,
      duplicates: rs.filter((r) => r.status === "duplicate").length,
      deadLetters: dead.length,
      lastSyncAt: rs.map((r) => r.receivedAt).sort().at(-1),
      cursor: `c_${rs.filter((r) => r.status !== "duplicate").length}`,
      lastError: dead.at(-1)?.error,
    };
    return { ...base, ...opts.integrationOverrides?.[provider] };
  });

  const signals = detectSignals({ events: resolved, dir: directory, opportunities: opps, postTopics, warmPaths, integrations, now });

  /* Account summaries */
  const accounts: AccountSummary[] = targets.map((company) => {
    const people = [...directory.people.values()].filter((p) => p.companyId === company.id);
    const ce = resolved.filter((e) => e.companyId === company.id && ENGAGEMENT.has(e.type));
    const e14 = ce.filter((e) => ageInDays(e.occurredAt, now) <= 14);
    const e30 = ce.filter((e) => ageInDays(e.occurredAt, now) <= 30);
    const weekly = Array.from({ length: 13 }, (_, w) => ce.filter((e) => Math.floor(ageInDays(e.occurredAt, now) / 7) === 12 - w).length);
    const bestPath = warmPaths.get(company.id)?.[0];
    // People AT the account who engaged (team replies/meetings name our side as actor, so use the counterpart).
    const counterpart = (e: ResolvedEvent) => (e.actorId && people.some((p) => p.id === e.actorId) ? e.actorId : e.subjectId && people.some((p) => p.id === e.subjectId) ? e.subjectId : undefined);
    const engagedPeople30d = new Set(e30.map(counterpart).filter(Boolean)).size;
    const warmth = Math.round((0.5 * Math.min(1, e14.length / 8) + 0.3 * (bestPath?.score ?? 0) + 0.2 * Math.min(1, engagedPeople30d / 3)) * 100);
    const opportunity = opps.filter((o) => o.companyId === company.id).sort((a, b) => (a.openedAt < b.openedAt ? 1 : -1))[0];
    return {
      company,
      people,
      engagement14d: e14.length,
      engagement30d: e30.length,
      engagedPeople30d,
      weekly,
      warmth,
      opportunity,
      bestPath,
      lastTouchAt: ce.at(-1)?.occurredAt,
      signals: signals.filter((s) => s.companyId === company.id),
    };
  });
  accounts.sort((a, b) => b.warmth - a.warmth || a.company.name.localeCompare(b.company.name));

  /* Campaigns: target the accounts that are actually warming */
  const warming = accounts.filter((a) => a.signals.some((s) => s.type === "account_warming")).map((a) => a.company.id);
  const campaigns: Campaign[] = defaultCampaigns(warming, new Date(now).toISOString());
  const campaignDrafts = new Map(campaigns.map((c) => [c.id, generateDrafts(c)]));

  /* Attribution: each opportunity is scored against an AS-OF graph (no look-ahead leakage). */
  const asOfGraphs = new Map<string, Graph>();
  const graphAsOf = (opp: Opportunity) => {
    if (!asOfGraphs.has(opp.id)) asOfGraphs.set(opp.id, projectGraph(resolved.filter((e) => e.occurredAt <= opp.openedAt), directory));
    return asOfGraphs.get(opp.id)!;
  };
  const attributionFor = (opp: Opportunity, model: AttributionModel): AttributionResult => attribute(opp, model, resolved, graphAsOf(opp), directory);

  const checksum = graphChecksum(graph);
  const normalizedChecksum = hashString(stableStringify(resolved));

  return {
    now,
    ingest: ing,
    repairedDeadLetters,
    directory,
    resolved,
    eventById,
    rawById,
    graph,
    checksum,
    normalizedChecksum,
    projectionLag,
    posts,
    postTopics,
    opportunities: opps,
    meetings,
    targets,
    accounts,
    warmPaths,
    signals,
    integrations,
    campaigns,
    campaignDrafts,
    attributionFor,
  };
}

/* ───────────── Presentation helpers shared by UI, agent and docs ───────────── */

export function personName(ws: Workspace, id?: string) {
  return id ? (ws.directory.people.get(id)?.name ?? id) : "Unknown";
}

export function companyName(ws: Workspace, id?: string) {
  return id ? (ws.directory.companies.get(id)?.name ?? id) : "—";
}

export function describeEvent(ws: Workspace, e: ResolvedEvent): { title: string; detail?: string; kind: "content" | "relationship" | "meeting" | "deal" | "data" } {
  const who = (id?: string) => personName(ws, id);
  const post = (id?: string) => ws.posts.find((p) => p.id === id)?.title;
  switch (e.type) {
    case "person_liked_post":
      return { title: `${who(e.actorId)} liked “${post(e.objectId) ?? e.objectId}”`, kind: "content" };
    case "person_commented_post":
      return { title: `${who(e.actorId)} commented on “${post(e.objectId) ?? e.objectId}”`, detail: String(e.metadata.text ?? ""), kind: "content" };
    case "team_replied_comment":
      return { title: `${who(e.actorId)} replied to ${who(e.subjectId)}`, kind: "relationship" };
    case "introduction_made":
      return { title: `${who(e.actorId)} introduced ${who(e.subjectId)} to ${who(String(e.metadata.toId ?? ""))}`, detail: String(e.metadata.text ?? ""), kind: "relationship" };
    case "meeting_created":
      return { title: `Meeting: ${String(e.metadata.title)}`, detail: String(e.metadata.attendeeIds ?? "").split(",").map(who).join(", "), kind: "meeting" };
    case "opportunity_opened":
      return { title: `Opportunity opened: ${String(e.metadata.name)}`, detail: `$${Number(e.metadata.amount).toLocaleString("en-US")} · synthetic`, kind: "deal" };
    case "opportunity_stage_changed":
      return { title: `Deal ${e.objectId} → ${String(e.metadata.stage).replace("_", " ")}`, kind: "deal" };
    case "revenue_closed_won":
      return { title: `Closed won: ${e.objectId}`, kind: "deal" };
    case "known_connection":
      return { title: `${who(e.actorId)} is connected to ${who(e.subjectId)}`, kind: "relationship" };
    case "crm_contact_owner":
      return { title: `${who(e.actorId)} owns contact ${who(e.subjectId)}`, kind: "relationship" };
    case "person_changed_company":
      return { title: `${who(e.actorId)} moved to ${String(e.metadata.toCompany)}`, kind: "data" };
    case "post_published":
      return { title: `${who(e.actorId)} published “${String(e.metadata.title)}”`, kind: "content" };
    case "draft_approved":
      return { title: `${who(e.actorId)} approved “${String(e.metadata.title)}”`, kind: "content" };
    case "crm_note_created":
      return { title: `${who(e.actorId)} logged a CRM note on ${who(e.subjectId)}`, detail: String(e.metadata.body ?? ""), kind: "relationship" };
    default:
      return { title: e.type.replace(/_/g, " "), kind: "data" };
  }
}

export function accountTimeline(ws: Workspace, companyId: string) {
  return ws.resolved
    .filter((e) => e.companyId === companyId && e.type !== "person_upserted" && e.type !== "company_upserted")
    .map((e) => ({ event: e, ...describeEvent(ws, e), date: formatDate(e.occurredAt) }))
    .reverse();
}

export function draftsFor(ws: Workspace, campaignId: string): Draft[] {
  return ws.campaignDrafts.get(campaignId)?.drafts ?? [];
}
