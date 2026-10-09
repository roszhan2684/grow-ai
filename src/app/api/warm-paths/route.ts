import { serverWorkspace } from "@/lib/server-state";
import { personName } from "@/core/workspace";

export async function GET(req: Request) {
  const company = new URL(req.url).searchParams.get("company") ?? "co_acme-robotics";
  const ws = serverWorkspace();
  if (!ws.directory.companies.has(company)) return Response.json({ error: "unknown company" }, { status: 404 });
  const paths = (ws.warmPaths.get(company) ?? []).slice(0, 5);
  return Response.json({
    company,
    paths: paths.map((p) => ({ path: p.nodeIds.map((id) => personName(ws, id)), score: p.score, components: p.components, explanation: p.explanation, evidence: p.evidence })),
  });
}
