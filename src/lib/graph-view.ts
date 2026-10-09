import type { Workspace } from "@/core/workspace";
import type { EdgeType } from "@/core/graph/project";

export type VizKind = "team" | "person" | "advisor" | "company" | "home" | "post" | "topic" | "opportunity";
export type VizNode = { id: string; kind: VizKind; name: string; sub?: string; influence: number; lastTouch?: string; companyId?: string };
export type VizEdge = { key: string; from: string; to: string; type: EdgeType; strength: number; firstSeenAt: string; lastSeenAt: string; evidence: string[]; sources: string[]; ended?: boolean };

export const RELATIONSHIP_TYPES: EdgeType[] = ["KNOWS", "CONNECTED_TO", "MET_WITH", "WORKS_AT", "ENGAGED_WITH", "COMMENTED_ON", "POSTED", "CREATED_OPPORTUNITY"];
export const DEFAULT_TYPES: EdgeType[] = ["KNOWS", "CONNECTED_TO", "MET_WITH", "WORKS_AT", "CREATED_OPPORTUNITY"];

export function buildGraphView(ws: Workspace, opts: { companyId?: string; types?: EdgeType[]; includeContent?: boolean } = {}) {
  const types = new Set(opts.types ?? (opts.includeContent ? [...DEFAULT_TYPES, "ENGAGED_WITH", "POSTED", "COMMENTED_ON"] : DEFAULT_TYPES));
  const g = ws.graph;
  const degree = new Map<string, number>();
  for (const e of g.edges.values()) {
    degree.set(e.from, (degree.get(e.from) ?? 0) + e.strength);
    degree.set(e.to, (degree.get(e.to) ?? 0) + e.strength);
  }
  const maxDeg = Math.max(1, ...degree.values());

  let allowed: Set<string> | undefined;
  if (opts.companyId) {
    allowed = new Set([opts.companyId]);
    for (const p of ws.directory.people.values()) if (p.companyId === opts.companyId || p.isTeamMember) allowed.add(p.id);
    for (const path of ws.warmPaths.get(opts.companyId) ?? []) for (const id of path.nodeIds) allowed.add(id);
    for (const o of ws.opportunities) if (o.companyId === opts.companyId) allowed.add(o.id);
  }

  const edges: VizEdge[] = [];
  const used = new Set<string>();
  for (const e of g.edges.values()) {
    if (!types.has(e.type)) continue;
    if (allowed && (!allowed.has(e.from) || !allowed.has(e.to))) continue;
    const a = g.nodes.get(e.from);
    const b = g.nodes.get(e.to);
    if (!a || !b) continue;
    // The home company only pulls the team into a clump; relationships carry the meaning.
    if (ws.directory.companies.get(e.from)?.isHome || ws.directory.companies.get(e.to)?.isHome) continue;
    if (!opts.includeContent && (a.label === "Post" || b.label === "Post")) continue;
    edges.push({ key: e.key, from: e.from, to: e.to, type: e.type, strength: e.strength, firstSeenAt: e.firstSeenAt, lastSeenAt: e.lastSeenAt, evidence: e.evidence, sources: e.sources, ended: !!e.endedAt });
    used.add(e.from);
    used.add(e.to);
  }

  const nodes: VizNode[] = [];
  for (const id of used) {
    const n = g.nodes.get(id)!;
    const person = ws.directory.people.get(id);
    const company = ws.directory.companies.get(id);
    const kind: VizKind = person
      ? person.isTeamMember
        ? "team"
        : person.companyId && ws.directory.companies.get(person.companyId)?.isTarget
          ? "person"
          : "advisor"
      : company
        ? company.isHome
          ? "home"
          : "company"
        : n.label === "Opportunity"
          ? "opportunity"
          : n.label === "Topic"
            ? "topic"
            : "post";
    const lastTouch = [...g.edges.values()].filter((e) => e.from === id || e.to === id).map((e) => e.lastSeenAt).sort().at(-1);
    nodes.push({
      id,
      kind,
      name: n.name,
      sub: person ? `${person.title || "—"}${person.companyId ? ` · ${ws.directory.companies.get(person.companyId)?.name ?? ""}` : ""}` : company ? company.industry : n.label,
      influence: (degree.get(id) ?? 0) / maxDeg,
      lastTouch,
      companyId: person?.companyId,
    });
  }
  nodes.sort((a, b) => (a.id < b.id ? -1 : 1));
  edges.sort((a, b) => (a.key < b.key ? -1 : 1));
  return { nodes, edges };
}
