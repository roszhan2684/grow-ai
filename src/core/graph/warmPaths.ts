/**
 * Warm-path search: team member → (≤3 relationship hops) → person who works at the target account.
 * Mirrors neo4j/projections/warm_paths.cypher. Rule-based and fully decomposed: every score ships
 * with its components and the evidence events behind each hop.
 */
import type { ResolvedEvent, Seniority } from "../contracts";
import type { Directory } from "../identity/resolve";
import { ageInDays, DEMO_NOW } from "../lib/time";
import { quantize, saturate, type Graph, type GraphEdge } from "./project";

export const WARM_PATH_WEIGHTS = {
  relationship_strength: 0.35,
  recency_score: 0.25,
  source_diversity: 0.15,
  role_relevance: 0.15,
  engagement_momentum: 0.1,
} as const;

export const ROLE_RELEVANCE: Record<Seniority, number> = { c_level: 0.9, vp: 1, director: 0.8, manager: 0.55, ic: 0.35 };

const TRAVERSABLE = new Set(["KNOWS", "CONNECTED_TO", "MET_WITH"]);

export type WarmPathHop = { from: string; to: string; edge: GraphEdge };

export type WarmPath = {
  id: string;
  companyId: string;
  sourceId: string;
  targetId: string;
  nodeIds: string[];
  hops: WarmPathHop[];
  score: number;
  components: Record<keyof typeof WARM_PATH_WEIGHTS, number>;
  explanation: string[];
  evidence: string[];
  newestEdgeAt: string;
};

/**
 * Collapse every traversable edge between two people (KNOWS, CONNECTED_TO, MET_WITH, either
 * direction) into ONE relationship: strength from summed raw interactions, union of sources and
 * evidence. Without this, a pair with a meeting AND an intro shows up as two "different" paths.
 */
export function buildAdjacency(g: Graph) {
  const pairs = new Map<string, GraphEdge>();
  const isPerson = (id: string) => /Person|TeamMember/.test(g.nodes.get(id)?.label ?? "");
  for (const e of g.edges.values()) {
    if (!TRAVERSABLE.has(e.type) || e.endedAt || !isPerson(e.from) || !isPerson(e.to)) continue;
    const [a, b] = e.from < e.to ? [e.from, e.to] : [e.to, e.from];
    const key = `REL:${a}<->${b}`;
    const prev = pairs.get(key);
    if (!prev) {
      pairs.set(key, { ...e, key, from: a, to: b, sources: [...e.sources], evidence: [...e.evidence], type: e.type });
      continue;
    }
    const raw = prev.rawStrength + e.rawStrength;
    const evidence = [...new Set([...prev.evidence, ...e.evidence])];
    pairs.set(key, {
      ...prev,
      type: prev.type === e.type ? prev.type : prev.type,
      rawStrength: raw,
      strength: saturate(raw),
      sources: [...new Set([...prev.sources, ...e.sources])],
      sourceCount: new Set([...prev.sources, ...e.sources]).size,
      evidence,
      firstSeenAt: prev.firstSeenAt < e.firstSeenAt ? prev.firstSeenAt : e.firstSeenAt,
      lastSeenAt: prev.lastSeenAt > e.lastSeenAt ? prev.lastSeenAt : e.lastSeenAt,
      confidence: quantize((prev.confidence * prev.evidence.length + e.confidence * e.evidence.length) / (prev.evidence.length + e.evidence.length)),
      relTypes: [...new Set([...(prev.relTypes ?? [prev.type]), e.type])],
    } as GraphEdge);
  }
  const adj = new Map<string, { to: string; edge: GraphEdge }[]>();
  const add = (a: string, b: string, edge: GraphEdge) => {
    if (!adj.has(a)) adj.set(a, []);
    adj.get(a)!.push({ to: b, edge });
  };
  for (const e of [...pairs.values()].sort((x, y) => (x.key < y.key ? -1 : 1))) {
    if (!e.relTypes) e.relTypes = [e.type];
    add(e.from, e.to, e);
    add(e.to, e.from, e);
  }
  return adj;
}

export function engagementMomentum(personId: string, events: readonly ResolvedEvent[], now = DEMO_NOW) {
  let recent = 0;
  for (const e of events) {
    if (e.actorId !== personId && e.subjectId !== personId) continue;
    if (!["person_liked_post", "person_commented_post", "meeting_created", "introduction_made"].includes(e.type)) continue;
    if (ageInDays(e.occurredAt, now) <= 14) recent += e.type === "person_liked_post" ? 1 : 2;
  }
  return Math.min(1, recent / 4);
}

export function findWarmPaths(
  g: Graph,
  dir: Directory,
  events: readonly ResolvedEvent[],
  companyId: string,
  opts: { maxHops?: number; limit?: number; now?: number; adjacency?: ReturnType<typeof buildAdjacency> } = {},
): WarmPath[] {
  const maxHops = opts.maxHops ?? 3;
  const now = opts.now ?? DEMO_NOW;
  const adj = opts.adjacency ?? buildAdjacency(g);
  const isTeam = (id: string) => dir.people.get(id)?.isTeamMember ?? false;
  const worksAtTarget = (id: string) => {
    const p = dir.people.get(id);
    return !!p && !p.isTeamMember && p.companyId === companyId;
  };
  const momentumCache = new Map<string, number>();
  const results: WarmPath[] = [];

  for (const start of dir.people.values()) {
    if (!start.isTeamMember) continue;
    const stack: { node: string; path: string[]; hops: WarmPathHop[] }[] = [{ node: start.id, path: [start.id], hops: [] }];
    while (stack.length) {
      const cur = stack.pop()!;
      if (cur.hops.length > 0 && worksAtTarget(cur.node)) {
        results.push(scorePath(cur.path, cur.hops, companyId, dir, events, now, momentumCache));
      }
      if (cur.hops.length >= maxHops) continue;
      for (const n of adj.get(cur.node) ?? []) {
        if (cur.path.includes(n.to) || isTeam(n.to)) continue;
        stack.push({ node: n.to, path: [...cur.path, n.to], hops: [...cur.hops, { from: cur.node, to: n.to, edge: n.edge }] });
      }
    }
  }

  results.sort((a, b) => b.score - a.score || a.hops.length - b.hops.length || (a.id < b.id ? -1 : 1));
  return results.slice(0, opts.limit ?? 20);
}

function scorePath(
  nodeIds: string[],
  hops: WarmPathHop[],
  companyId: string,
  dir: Directory,
  events: readonly ResolvedEvent[],
  now: number,
  momentumCache: Map<string, number>,
): WarmPath {
  const target = dir.people.get(nodeIds[nodeIds.length - 1]!)!;
  const strengths = hops.map((h) => h.edge.strength);
  const recencies = hops.map((h) => quantize(Math.exp(-ageInDays(h.edge.lastSeenAt, now) / 45)));
  const sources = new Set(hops.flatMap((h) => h.edge.sources));
  if (!momentumCache.has(target.id)) momentumCache.set(target.id, engagementMomentum(target.id, events, now));

  const components = {
    relationship_strength: Math.min(...strengths),
    recency_score: Math.min(...recencies),
    source_diversity: Math.min(1, sources.size / 3),
    role_relevance: ROLE_RELEVANCE[target.seniority],
    engagement_momentum: momentumCache.get(target.id)!,
  };
  const score = (Object.keys(WARM_PATH_WEIGHTS) as (keyof typeof WARM_PATH_WEIGHTS)[]).reduce((s, k) => s + components[k] * WARM_PATH_WEIGHTS[k], 0);
  const name = (id: string) => dir.people.get(id)?.name ?? id;
  const explanation = hops.map(
    (h) => `${name(h.from)} —${(h.edge.relTypes ?? [h.edge.type]).join("+")}— ${name(h.to)} · strength ${h.edge.strength.toFixed(2)} · ${h.edge.sources.join("+")} · ${h.edge.evidence.length} evidence event${h.edge.evidence.length === 1 ? "" : "s"}`,
  );
  explanation.push(`${target.name} is ${target.title} (role relevance ${components.role_relevance.toFixed(2)}); weakest link ${components.relationship_strength.toFixed(2)}.`);
  return {
    id: `wp_${nodeIds.join(">")}`,
    companyId,
    sourceId: nodeIds[0]!,
    targetId: target.id,
    nodeIds,
    hops,
    score: Math.round(score * 1000) / 1000,
    components,
    explanation,
    evidence: [...new Set(hops.flatMap((h) => h.edge.evidence))],
    newestEdgeAt: hops.map((h) => h.edge.firstSeenAt).sort().at(-1)!,
  };
}
