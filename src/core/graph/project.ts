/**
 * Graph projection: resolved Postgres-side events → relationship graph.
 * The graph is DERIVED. It can be thrown away and rebuilt from events at any time; a rebuild over
 * the same events produces the same checksum (see tests/replay).
 */
import type { Person, ResolvedEvent } from "../contracts";
import type { Directory } from "../identity/resolve";
import { hashString, stableStringify } from "../lib/hash";

export const PROJECTION_VERSION = "proj-v3";

export type NodeLabel = "Person" | "TeamMember" | "Company" | "Post" | "Topic" | "Meeting" | "Opportunity" | "RevenueEvent";
export type EdgeType =
  | "WORKS_AT"
  | "KNOWS"
  | "CONNECTED_TO"
  | "POSTED"
  | "ABOUT_TOPIC"
  | "ENGAGED_WITH"
  | "COMMENTED_ON"
  | "MET_WITH"
  | "CREATED_OPPORTUNITY"
  | "INFLUENCED"
  | "ATTRIBUTED_TO";

export type GraphNode = { id: string; label: NodeLabel; name: string; props: Record<string, string | number | boolean | null> };

export type GraphEdge = {
  key: string;
  type: EdgeType;
  from: string;
  to: string;
  firstSeenAt: string;
  lastSeenAt: string;
  rawStrength: number;
  /** 0..1, saturating: 1 - e^(-raw/6) */
  strength: number;
  sourceCount: number;
  confidence: number;
  sources: string[];
  evidence: string[];
  endedAt?: string;
  /** Set on collapsed person↔person relationships (warm-path adjacency only). */
  relTypes?: EdgeType[];
};

export type Graph = {
  nodes: Map<string, GraphNode>;
  edges: Map<string, GraphEdge>;
  version: string;
  sourceEventIds: string[];
};

/** Interaction weights used to build edge strength. Kept explicit so they can be shown in the UI. */
export const STRENGTH_INCREMENTS = {
  known_connection: 4,
  crm_contact_owner: 3,
  like: 1,
  comment: 3,
  comment_engagement: 2,
  reply: 2,
  intro_introducer: 3,
  intro_recipient: 6,
  meeting: 5,
  crm_note: 1,
} as const;

/**
 * Derived floats are quantized to a canonical precision. Math.exp is not bit-identical across
 * JS engines (Node's V8 and Chrome's V8 disagree in the last ulp), and an unquantized value made
 * the "same" graph checksum differently on the server and in the browser.
 */
export const quantize = (x: number) => Math.round(x * 1e9) / 1e9;
export const saturate = (raw: number) => quantize(1 - Math.exp(-raw / 6));

export function projectGraph(resolved: readonly ResolvedEvent[], dir: Directory): Graph {
  const nodes = new Map<string, GraphNode>();
  const edges = new Map<string, GraphEdge>();
  const confSum = new Map<string, number>();

  const node = (id: string, label: NodeLabel, name: string, props: GraphNode["props"] = {}) => {
    const prev = nodes.get(id);
    nodes.set(id, { id, label, name, props: { ...prev?.props, ...props } });
  };

  const personNode = (p: Person) =>
    node(p.id, p.isTeamMember ? "TeamMember" : "Person", p.name, {
      title: p.title,
      seniority: p.seniority,
      companyId: p.companyId ?? null,
      identityConfidence: p.identityConfidence,
    });

  const edge = (type: EdgeType, from: string, to: string, inc: number, e: ResolvedEvent) => {
    const key = `${type}:${from}->${to}`;
    const prev = edges.get(key);
    const sources = prev ? (prev.sources.includes(e.source) ? prev.sources : [...prev.sources, e.source]) : [e.source];
    const evidence = prev ? (prev.evidence.includes(e.id) ? prev.evidence : [...prev.evidence, e.id]) : [e.id];
    const rawStrength = (prev?.rawStrength ?? 0) + (prev?.evidence.includes(e.id) ? 0 : inc);
    confSum.set(key, (confSum.get(key) ?? 0) + (prev?.evidence.includes(e.id) ? 0 : e.identityConfidence));
    edges.set(key, {
      key,
      type,
      from,
      to,
      firstSeenAt: prev?.firstSeenAt ?? e.occurredAt,
      lastSeenAt: e.occurredAt > (prev?.lastSeenAt ?? "") ? e.occurredAt : prev!.lastSeenAt,
      rawStrength,
      strength: saturate(rawStrength),
      sourceCount: sources.length,
      confidence: quantize((confSum.get(key) ?? 0) / evidence.length),
      sources,
      evidence,
    });
  };

  for (const c of dir.companies.values()) node(c.id, "Company", c.name, { domain: c.domain, industry: c.industry, isTarget: c.isTarget, isHome: c.isHome });
  for (const p of dir.people.values()) personNode(p);

  const postAuthor = new Map<string, string>();
  const opps = new Map<string, string>(); // dealId → opp node id

  for (const e of resolved) {
    const m = e.metadata;
    switch (e.type) {
      case "person_upserted":
        if (e.actorId && e.companyId) edge("WORKS_AT", e.actorId, e.companyId, 1, e);
        break;
      case "person_changed_company": {
        const p = e.actorId ? dir.people.get(e.actorId) : undefined;
        if (!p) break;
        for (const prevCo of p.previousCompanyIds) {
          const k = `WORKS_AT:${p.id}->${prevCo}`;
          const old = edges.get(k);
          if (old && !old.endedAt) edges.set(k, { ...old, endedAt: e.occurredAt });
        }
        if (p.companyId) edge("WORKS_AT", p.id, p.companyId, 1, e);
        break;
      }
      case "known_connection":
        if (e.actorId && e.subjectId) edge("KNOWS", e.actorId, e.subjectId, STRENGTH_INCREMENTS.known_connection, e);
        break;
      case "crm_contact_owner":
        if (e.actorId && e.subjectId) edge("CONNECTED_TO", e.actorId, e.subjectId, STRENGTH_INCREMENTS.crm_contact_owner, e);
        break;
      case "crm_note_created":
        if (e.actorId && e.subjectId) edge("CONNECTED_TO", e.actorId, e.subjectId, STRENGTH_INCREMENTS.crm_note, e);
        break;
      case "post_published": {
        if (!e.objectId || !e.actorId) break;
        const topicId = `topic_${String(m.topic).toLowerCase().replace(/[^a-z]+/g, "-")}`;
        node(e.objectId, "Post", String(m.title), { topic: String(m.topic), authorId: e.actorId, publishedAt: e.occurredAt });
        node(topicId, "Topic", String(m.topic));
        postAuthor.set(e.objectId, e.actorId);
        edge("POSTED", e.actorId, e.objectId, 1, e);
        edge("ABOUT_TOPIC", e.objectId, topicId, 1, e);
        break;
      }
      case "person_liked_post":
        if (e.actorId && e.objectId) edge("ENGAGED_WITH", e.actorId, e.objectId, STRENGTH_INCREMENTS.like, e);
        break;
      case "person_commented_post":
        if (e.actorId && e.objectId) {
          edge("COMMENTED_ON", e.actorId, e.objectId, STRENGTH_INCREMENTS.comment, e);
          edge("ENGAGED_WITH", e.actorId, e.objectId, STRENGTH_INCREMENTS.comment_engagement, e);
        }
        break;
      case "team_replied_comment":
        // A direct reply is a 1:1 interaction between our team member and the commenter.
        if (e.actorId && e.subjectId) edge("CONNECTED_TO", e.actorId, e.subjectId, STRENGTH_INCREMENTS.reply, e);
        break;
      case "introduction_made": {
        const toId = typeof m.toId === "string" ? m.toId : undefined;
        if (e.actorId && e.subjectId) edge("KNOWS", e.actorId, e.subjectId, STRENGTH_INCREMENTS.intro_introducer, e);
        if (toId && e.subjectId) edge("KNOWS", toId, e.subjectId, STRENGTH_INCREMENTS.intro_recipient, e);
        break;
      }
      case "meeting_created": {
        if (!e.objectId) break;
        const ids = String(m.attendeeIds ?? "").split(",").filter((x) => x && x !== "unknown");
        node(e.objectId, "Meeting", String(m.title), { companyId: e.companyId ?? null, occurredAt: e.occurredAt });
        const team = ids.filter((id) => dir.people.get(id)?.isTeamMember);
        const guests = ids.filter((id) => !dir.people.get(id)?.isTeamMember);
        for (const g of guests) for (const t of team) edge("MET_WITH", g, t, STRENGTH_INCREMENTS.meeting, e);
        if (e.companyId) for (const t of team) edge("MET_WITH", e.companyId, t, STRENGTH_INCREMENTS.meeting, e);
        break;
      }
      case "opportunity_opened": {
        if (!e.objectId || !e.companyId) break;
        const id = `opp_${e.objectId}`;
        opps.set(e.objectId, id);
        node(id, "Opportunity", String(m.name), { amount: Number(m.amount), stage: String(m.stage), companyId: e.companyId, openedAt: e.occurredAt });
        edge("CREATED_OPPORTUNITY", e.companyId, id, 1, e);
        break;
      }
      case "opportunity_stage_changed": {
        const id = e.objectId ? opps.get(e.objectId) : undefined;
        if (id) node(id, "Opportunity", nodes.get(id)!.name, { stage: String(m.stage), ...(m.stage === "closed_won" || m.stage === "closed_lost" ? { closedAt: e.occurredAt } : {}) });
        break;
      }
      case "revenue_closed_won": {
        const id = e.objectId ? opps.get(e.objectId) : undefined;
        if (!id) break;
        const rev = `rev_${e.objectId}`;
        node(rev, "RevenueEvent", `Closed won: ${nodes.get(id)!.name}`, { amount: Number(nodes.get(id)!.props.amount), occurredAt: e.occurredAt });
        edge("ATTRIBUTED_TO", id, rev, 1, e);
        break;
      }
      default:
        break;
    }
  }

  return { nodes, edges, version: PROJECTION_VERSION, sourceEventIds: resolved.map((e) => e.id) };
}

/** Order-independent checksum of graph state. Equal checksums ⇔ identical projection. */
export function graphChecksum(g: Graph) {
  const nodes = [...g.nodes.values()].sort((a, b) => (a.id < b.id ? -1 : 1));
  const edges = [...g.edges.values()].sort((a, b) => (a.key < b.key ? -1 : 1));
  return hashString(stableStringify({ v: g.version, nodes, edges }));
}

export function neighbors(g: Graph, id: string) {
  const out: GraphEdge[] = [];
  for (const e of g.edges.values()) if (e.from === id || e.to === id) out.push(e);
  return out;
}
