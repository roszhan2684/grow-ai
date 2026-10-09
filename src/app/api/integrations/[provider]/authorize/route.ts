import { cookies } from "next/headers";
import { createAuthorizationRequest, createConnectors } from "@/core/integrations/connector";
import { generateSeed } from "@/core/seed/generate";

/** Builds a real OAuth authorization URL with state + PKCE (S256). Verifier stays server-side in an httpOnly cookie. */
export async function GET(req: Request, ctx: RouteContext<"/api/integrations/[provider]/authorize">) {
  const { provider } = await ctx.params;
  const connectors = createConnectors(generateSeed().rawEvents) as Record<string, ReturnType<typeof createConnectors>["hubspot"]>;
  const c = connectors[provider];
  if (!c || c.provider === "csv_crm" || c.provider === "social") return Response.json({ error: "provider does not use OAuth" }, { status: 404 });
  const redirect = new URL(`/api/integrations/${provider}/callback`, req.url).toString();
  const { url, state, verifier } = await createAuthorizationRequest(c, redirect);
  const jar = await cookies();
  jar.set(`grow_oauth_${provider}`, JSON.stringify({ state, verifier }), { httpOnly: true, sameSite: "lax", secure: true, maxAge: 600, path: "/" });
  const u = new URL(url);
  return Response.json({
    provider,
    mode: c.mode,
    authorizationUrl: url,
    state,
    codeChallenge: u.searchParams.get("code_challenge"),
    codeChallengeMethod: "S256",
    note: c.mode === "live" ? "Redirect the user here." : `Demo: ${c.displayName} has no registered OAuth app, so the URL is built to spec but not followed. The verifier is stored httpOnly and never returned.`,
  });
}
