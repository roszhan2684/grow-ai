import { generateSeed } from "@/core/seed/generate";
import { buildWorkspace } from "@/core/workspace";
import { PROJECTION_VERSION } from "@/core/graph/project";
import { ATTRIBUTION_VERSION } from "@/core/attribution/models";

export async function GET() {
  const ws = buildWorkspace(generateSeed().rawEvents);
  return Response.json({
    status: "ok",
    mode: "sample workspace (in-process engine)",
    projectionVersion: PROJECTION_VERSION,
    attributionVersion: ATTRIBUTION_VERSION,
    graphChecksum: ws.checksum,
    normalizedChecksum: ws.normalizedChecksum,
    counts: { raw: ws.ingest.raw.length, normalized: ws.resolved.length, nodes: ws.graph.nodes.size, edges: ws.graph.edges.size, deadLetters: ws.ingest.stats.deadLetters, duplicates: ws.ingest.stats.duplicates },
    integrations: ws.integrations.map((i) => ({ provider: i.provider, mode: i.mode, status: i.status, deadLetters: i.deadLetters })),
  });
}
