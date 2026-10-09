import { generateSeed } from "@/core/seed/generate";
import { buildWorkspace, personName } from "@/core/workspace";

export async function GET() {
  const ws = buildWorkspace(generateSeed().rawEvents);
  return Response.json({
    data: ws.accounts.map((a) => ({
      id: a.company.id,
      name: a.company.name,
      warmth: a.warmth,
      interactions14d: a.engagement14d,
      opportunity: a.opportunity ? { stage: a.opportunity.stage, amount: a.opportunity.amount } : null,
      bestPath: a.bestPath ? { path: a.bestPath.nodeIds.map((id) => personName(ws, id)), score: a.bestPath.score } : null,
      signals: a.signals.map((s) => s.type),
    })),
    note: "Synthetic demo data.",
  });
}
