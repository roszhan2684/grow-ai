import type { Metadata } from "next";
import { PageHeader } from "@/components/site/SiteChrome";

export const metadata: Metadata = { title: "Security", description: "Threat model and tested mitigations for GROW AI." };

const THREATS: [string, string, string, string][] = [
  ["Cross-tenant data access", "org_id on every customer row; RLS via is_member(); org-partitioned graph keys", "partial", "RLS policies written (0002_rls.sql); not yet exercised against a live database"],
  ["OAuth token leakage", "AES-GCM encrypted at rest; token values kept apart from metadata; mandatory log redaction", "tested", "integrations.test.ts: round trip + “logs never contain tokens”"],
  ["Webhook spoofing", "HMAC-SHA256 over method + path + body + timestamp; constant-time compare", "tested", "Forged signature rejected; tampered body → 401"],
  ["Webhook replay", "±5 min timestamp tolerance; seen-signature set; dedupe on provider ID + payload hash", "tested", "Replayed signature rejected; 5 deliveries → 1 normalized event"],
  ["OAuth CSRF / code interception", "state + PKCE (S256); verifier stored httpOnly, never returned to the client", "tested", "PKCE challenge length + determinism"],
  ["Prompt injection in ingested content", "Ingested text returned separately and marked untrusted; plans built from the user's request only; instruction-shaped text flagged", "tested", "20/20 injection eval cases; seeded hostile comment"],
  ["Agent side effects", "Static per-tool policy (ALLOW / REQUIRE_APPROVAL / DENY); idempotency keys; audit entries", "tested", "30/30 policy eval cases; approve-twice is a no-op"],
  ["Duplicate side effects on retry", "Side effects are proposed once with a fixed idempotency key; retries never re-issue them", "tested", "LLM-timeout scenario: identical pending actions across retries"],
  ["PII over-collection", "Connectors normalize to the minimal domain fields; provider payloads never leave the connector", "design", "Normalizers are the only place provider shapes exist"],
];

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="Security" title="A threat model that names what isn't finished.">
        Mitigations marked <strong>tested</strong> have a test in the repo that fails if they regress. <strong>Partial</strong> means the control is written but not yet proven against live infrastructure.
      </PageHeader>
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-[13px]">
            <thead className="border-b border-line bg-surface-2 text-[11px] uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-2.5 font-medium">Threat</th>
                <th className="px-4 py-2.5 font-medium">Mitigation</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Evidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {THREATS.map(([t, m, s, e]) => (
                <tr key={t} className="align-top">
                  <td className="px-4 py-3 font-medium">{t}</td>
                  <td className="px-4 py-3 text-ink-2">{m}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-md border px-1.5 py-0.5 font-mono text-[11px] ${s === "tested" ? "border-[#c5e6cf] bg-[#e8f5ec] text-positive" : s === "partial" ? "border-[#f3d9b1] bg-[#fdf3e3] text-warning" : "border-line bg-surface-2 text-ink-2"}`}>{s}</span>
                  </td>
                  <td className="px-4 py-3 text-[12.5px] text-muted">{e}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-[13px] text-muted">The demo webhook secret is public by design so visitors can sign test requests. Production would load it from the environment, which the route already supports.</p>
      </div>
    </>
  );
}
