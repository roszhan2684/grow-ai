import { z } from "zod";
import { runAgent } from "@/core/agents/runtime";
import { serverWorkspace } from "@/lib/server-state";

const Body = z.object({ prompt: z.string().min(1).max(500), companyId: z.string().optional() });

/** Run the agent server-side against the seeded workspace. Side-effect tools come back as pending approvals. */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  const run = await runAgent(serverWorkspace(), parsed.data.prompt, { companyId: parsed.data.companyId });
  return Response.json(run);
}
