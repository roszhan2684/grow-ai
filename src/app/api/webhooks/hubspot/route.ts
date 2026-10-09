import { RawEventSchema } from "@/core/contracts";
import { verifySignedWebhook } from "@/core/integrations/connector";
import { ingest } from "@/core/ingest/pipeline";
import { hashPayload } from "@/core/lib/hash";
import { DEMO_WEBHOOK_SECRET, seenProviderIds, seenSignatures } from "@/lib/server-state";

/**
 * Signed webhook ingestion: verify HMAC + timestamp + replay → validate → dedupe → normalize.
 * Raw state is recorded BEFORE normalization; normalization failures are reported, not thrown.
 */
export async function POST(req: Request) {
  const body = await req.text();
  const headers = Object.fromEntries(req.headers.entries());
  const url = new URL(req.url);
  const v = await verifySignedWebhook({ headers, body, method: "POST", url: url.pathname }, DEMO_WEBHOOK_SECRET, Date.now(), seenSignatures);
  if (!v.ok) return Response.json({ accepted: false, reason: v.reason }, { status: 401 });

  let json: unknown;
  try {
    json = JSON.parse(body);
  } catch {
    return Response.json({ accepted: false, reason: "body is not JSON" }, { status: 400 });
  }
  const parsed = RawEventSchema.safeParse(json);
  if (!parsed.success) return Response.json({ accepted: false, reason: parsed.error.issues[0]?.message }, { status: 422 });
  const event = { ...parsed.data, provider: "hubspot" as const };

  const key = `${event.provider}:${event.providerEventId}:${hashPayload(event.payload)}`;
  if (seenProviderIds.has(key)) return Response.json({ accepted: true, status: "duplicate", note: "already ingested on this instance; not re-normalized" });
  seenProviderIds.add(key);

  const result = ingest([event]);
  const raw = result.raw[0]!;
  return Response.json({ accepted: true, status: raw.status, error: raw.error, rawEventId: raw.id, hash: raw.hash, normalized: result.normalized }, { status: raw.status === "dead_letter" ? 202 : 200 });
}
