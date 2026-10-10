import { z } from "zod";

const Lead = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  company: z.string().trim().min(1).max(160),
  role: z.string().trim().max(120).optional().default(""),
  teamSize: z.string().trim().max(40).optional().default(""),
  plan: z.string().trim().max(40).optional().default(""),
  message: z.string().trim().max(2000).optional().default(""),
  website: z.string().max(0).optional(), // honeypot: real people leave this empty
});

/**
 * Demo requests. Leads are forwarded to CONTACT_WEBHOOK_URL (Slack, Zapier, Make, a CRM endpoint…).
 * Without it configured the route says so, and the form falls back to email, so no lead is silently dropped.
 */
export async function POST(req: Request) {
  const parsed = Lead.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false, error: parsed.error.issues[0]?.message ?? "invalid" }, { status: 400 });
  const url = process.env.CONTACT_WEBHOOK_URL;
  if (!url) return Response.json({ ok: false, error: "not_configured" }, { status: 503 });
  const lead = parsed.data;
  const text = `New GROW AI demo request: ${lead.name} <${lead.email}> · ${lead.company}${lead.role ? ` · ${lead.role}` : ""}${lead.teamSize ? ` · team ${lead.teamSize}` : ""}${lead.plan ? ` · plan ${lead.plan}` : ""}${lead.message ? `\n${lead.message}` : ""}`;
  const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text, lead }) }).catch(() => null);
  if (!r || !r.ok) return Response.json({ ok: false, error: "delivery_failed" }, { status: 502 });
  return Response.json({ ok: true });
}
