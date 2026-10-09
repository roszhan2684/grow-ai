"use client";

import Link from "next/link";
import { useState } from "react";
import { useDemo, SEED } from "@/lib/demo-store";
import { Badge, Button, Card, Mono, SectionTitle, StatusBadge } from "@/components/ui";
import { parseCsv, csvToRawEvents, CSV_COLUMNS } from "@/core/integrations/csv";
import { signWebhook } from "@/core/integrations/connector";
import { seedContactsCsv } from "@/core/seed/generate";
import { formatRelative } from "@/core/lib/time";
import type { RawEvent } from "@/core/contracts";

const MODE_NOTE = {
  live: "Fully working: parses, validates and ingests in this demo.",
  mock: "Realistic OAuth + signed-webhook contract against a mock upstream (no HubSpot app registered).",
  fixture: "Replays recorded fixtures through the real connector pipeline. Not a live API.",
} as const;

const DEMO_SECRET = "whsec_demo_only_not_a_real_secret";
const SAMPLE_CSV = `${seedContactsCsv()}\nava.lin@vantage-mobility.example,Ava Lin,Head of Platform,vantage-mobility.example,director\nnot-an-email,Broken Row,CTO,example.example,c_level`;

export function IntegrationsView() {
  const { ws, actions } = useDemo();
  const [csv, setCsv] = useState(SAMPLE_CSV);
  const [preview, setPreview] = useState<{ events: RawEvent[]; errors: string[] } | null>(null);
  const [oauth, setOauth] = useState<Record<string, unknown> | null>(null);
  const [hook, setHook] = useState<{ label: string; status: number; body: unknown }[]>([]);

  const parse = () => setPreview(csvToRawEvents(parseCsv(csv), new Date(ws.now).toISOString()));

  const startOAuth = async (provider: string) => {
    const r = await fetch(`/api/integrations/${provider}/authorize`);
    setOauth(await r.json());
  };

  const meetingEvent = () => ({
    provider: "hubspot",
    providerEventId: "hs_mtg_demo_acme_followup",
    kind: "meeting.created",
    receivedAt: new Date(ws.now).toISOString(),
    payload: { meetingId: "mtg_acme_followup", companyDomain: "acme-robotics.example", title: "Acme follow-up: SLO workshop", attendeeEmails: ["daniel.reyes@northstar-cloud.example", "tomas.lindqvist@acme-robotics.example", "sam.patel@acme-robotics.example"] },
  });

  const sendWebhook = async (variant: "valid" | "tampered" | "stale") => {
    const body = JSON.stringify(meetingEvent());
    const ts = variant === "stale" ? Date.now() - 10 * 60_000 : Date.now();
    const sig = await signWebhook(DEMO_SECRET, "POST", "/api/webhooks/hubspot", body, ts);
    const r = await fetch("/api/webhooks/hubspot", { method: "POST", headers: { "content-type": "application/json", "x-grow-signature": sig, "x-grow-timestamp": String(ts) }, body: variant === "tampered" ? body.replace("SLO workshop", "SLO workshop!!") : body });
    const json = await r.json();
    setHook((h) => [{ label: variant, status: r.status, body: json }, ...h].slice(0, 6));
    if (r.ok && json.status === "normalized") actions.importCsv([meetingEvent() as RawEvent]);
  };

  return (
    <div>
      <SectionTitle eyebrow="Integrations" title="Connectors" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {ws.integrations.map((i) => (
          <Card key={i.provider} className="flex flex-col">
            <div className="flex-1 space-y-3 px-5 py-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[14px] font-semibold">{i.displayName}</p>
                  <Badge tone={i.mode === "live" ? "positive" : "neutral"} mono>
                    {i.mode}
                  </Badge>
                </div>
                <StatusBadge status={i.deadLetters ? "DEGRADED" : i.status} />
              </div>
              <p className="text-[11.5px] text-muted">{MODE_NOTE[i.mode]}</p>
              <dl className="grid grid-cols-2 gap-y-1 text-[11.5px]">
                <dt className="text-muted">Received</dt>
                <dd className="tnum text-right">{i.received}</dd>
                <dt className="text-muted">Normalized</dt>
                <dd className="tnum text-right">{i.normalized}</dd>
                <dt className="text-muted">Duplicates</dt>
                <dd className="tnum text-right">{i.duplicates}</dd>
                <dt className="text-muted">Dead letters</dt>
                <dd className={`tnum text-right ${i.deadLetters ? "text-danger" : ""}`}>{i.deadLetters}</dd>
                <dt className="text-muted">Cursor</dt>
                <dd className="text-right font-mono">{i.cursor}</dd>
                <dt className="text-muted">Last success</dt>
                <dd className="text-right">{i.lastSyncAt ? formatRelative(i.lastSyncAt) : "—"}</dd>
              </dl>
              {i.scopes.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {i.scopes.map((s) => (
                    <Mono key={s} className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px]">
                      {s}
                    </Mono>
                  ))}
                </div>
              )}
              {i.lastError && <p className="rounded-md bg-[#fdecec] px-2 py-1.5 font-mono text-[10.5px] text-danger">last error: {i.lastError}</p>}
            </div>
            <footer className="flex flex-wrap gap-2 border-t border-line px-5 py-3">
              {(i.provider === "hubspot" || i.provider === "slack") && (
                <Button size="sm" onClick={() => startOAuth(i.provider)}>
                  Reconnect (OAuth + PKCE)
                </Button>
              )}
              {i.deadLetters > 0 && (
                <Link href="/app/graph/data-quality" className="inline-flex h-7 items-center rounded-lg border border-line-strong px-2.5 text-xs font-medium hover:bg-surface-2">
                  Replay dead letters
                </Link>
              )}
            </footer>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card className="px-5 py-4">
          <p className="text-[13px] font-semibold">MCP server <Badge>not shipped</Badge></p>
          <p className="mt-1 text-xs text-muted">Stretch goal: expose search_graph / find_warm_paths as MCP tools. Listed honestly as unstarted in BUILD_STATUS.</p>
        </Card>
        <Card className="px-5 py-4">
          <p className="text-[13px] font-semibold">Stripe <Badge>local plan state only</Badge></p>
          <p className="mt-1 text-xs text-muted">Seat upgrades change the allowance in Settings and are audited. Stripe test-mode checkout is not wired in this build.</p>
        </Card>
      </div>

      {oauth && (
        <Card title="Authorization request" subtitle="Built by GET /api/integrations/[provider]/authorize" className="mt-6" action={<Button size="sm" variant="ghost" onClick={() => setOauth(null)}>Close</Button>}>
          <pre className="overflow-x-auto px-5 py-4 font-mono text-[11px] leading-relaxed text-ink-2">{JSON.stringify(oauth, null, 2)}</pre>
        </Card>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card title="CSV CRM import" subtitle={`Columns: ${CSV_COLUMNS.join(", ")} · re-importing the same rows is absorbed as duplicates`}>
          <div className="space-y-3 px-5 py-4">
            <label htmlFor="csv" className="sr-only">
              CSV contents
            </label>
            <textarea id="csv" value={csv} onChange={(e) => setCsv(e.target.value)} rows={8} className="w-full rounded-lg border border-line bg-surface-2 p-3 font-mono text-[11px] outline-none focus:border-accent" />
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex h-9 cursor-pointer items-center rounded-lg border border-line-strong bg-surface px-3.5 text-[13px] font-medium hover:bg-surface-2">
                Upload .csv
                <input type="file" accept=".csv,text/csv" className="sr-only" onChange={async (e) => e.target.files?.[0] && setCsv(await e.target.files[0].text())} />
              </label>
              <Button onClick={parse}>Validate</Button>
              {preview && (
                <Button
                  variant="primary"
                  disabled={!preview.events.length}
                  onClick={() => {
                    actions.importCsv(preview.events);
                    setPreview(null);
                  }}
                >
                  Import {preview.events.length} rows
                </Button>
              )}
            </div>
            {preview && (
              <div className="rounded-lg border border-line text-xs">
                <p className="border-b border-line px-3 py-2">
                  <span className="text-positive">{preview.events.length} valid</span> · <span className={preview.errors.length ? "text-danger" : ""}>{preview.errors.length} rejected</span> · existing emails will dedupe on import
                </p>
                {preview.errors.map((e) => (
                  <p key={e} className="px-3 py-1.5 font-mono text-[11px] text-danger">
                    {e}
                  </p>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card title="Signed webhook tester" subtitle="Real POST to /api/webhooks/hubspot. HMAC-SHA256 over method + path + body + timestamp. Demo secret is public by design.">
          <div className="space-y-3 px-5 py-4">
            <p className="text-[12.5px] text-ink-2">
              Sends a <Mono>meeting.created</Mono> for Acme (the golden demo&apos;s meeting fixture). Send it twice: the second delivery dedupes.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" size="sm" onClick={() => sendWebhook("valid")}>
                Send valid webhook
              </Button>
              <Button size="sm" onClick={() => sendWebhook("tampered")}>
                Send tampered body
              </Button>
              <Button size="sm" onClick={() => sendWebhook("stale")}>
                Send stale timestamp
              </Button>
            </div>
            <ul className="space-y-2">
              {hook.map((h, i) => (
                <li key={i} className="log-in rounded-lg border border-line p-2.5">
                  <div className="flex items-center gap-2 text-xs">
                    <Badge mono tone={h.status < 300 ? "positive" : "danger"}>
                      {h.status}
                    </Badge>
                    <span className="font-medium">{h.label}</span>
                  </div>
                  <pre className="mt-1.5 max-h-40 overflow-auto font-mono text-[10.5px] text-ink-2">{JSON.stringify(h.body, null, 2)}</pre>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>
      <p className="mt-4 text-xs text-muted">Seed corpus: {SEED.rawEvents.length} raw events across 5 providers. Everything above is derived from them plus your local actions.</p>
    </div>
  );
}
