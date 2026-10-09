/**
 * Neo4j export. The in-process projection is the reference implementation; this renders the exact
 * same nodes/edges as idempotent MERGE statements so a Neo4j instance can be rebuilt from Postgres.
 * Status: statement generation is unit-tested; execution against a live Neo4j is not yet verified.
 */
import type { Graph } from "./project";

const lit = (v: unknown): string => {
  if (v === null || v === undefined) return "null";
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return `[${v.map(lit).join(", ")}]`;
  return `'${String(v).replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
};

const props = (o: Record<string, unknown>) =>
  `{${Object.entries(o)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}: ${lit(v)}`)
    .join(", ")}}`;

export function graphToCypher(g: Graph, orgId = "org_demo"): string[] {
  const out: string[] = [];
  const nodes = [...g.nodes.values()].sort((a, b) => (a.id < b.id ? -1 : 1));
  for (const n of nodes) {
    out.push(`MERGE (n:${n.label} {org_id: ${lit(orgId)}, id: ${lit(n.id)}}) SET n += ${props({ name: n.name, ...n.props, projection_version: g.version })};`);
  }
  const edges = [...g.edges.values()].sort((a, b) => (a.key < b.key ? -1 : 1));
  for (const e of edges) {
    out.push(
      `MATCH (a {org_id: ${lit(orgId)}, id: ${lit(e.from)}}), (b {org_id: ${lit(orgId)}, id: ${lit(e.to)}}) ` +
        `MERGE (a)-[r:${e.type}]->(b) SET r += ${props({
          first_seen_at: e.firstSeenAt,
          last_seen_at: e.lastSeenAt,
          strength: Number(e.strength.toFixed(4)),
          source_count: e.sourceCount,
          confidence: Number(e.confidence.toFixed(3)),
          sources: e.sources,
          evidence: e.evidence,
          ended_at: e.endedAt,
          decay_version: g.version,
        })};`,
    );
  }
  return out;
}
