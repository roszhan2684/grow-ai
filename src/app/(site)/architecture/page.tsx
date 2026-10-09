import type { Metadata } from "next";
import { PageHeader } from "@/components/site/SiteChrome";
import { ArchitectureDiagram } from "@/components/site/ArchitectureDiagram";

export const metadata: Metadata = { title: "Architecture", description: "Postgres as the system of record, a rebuildable graph projection, connector contracts, a policy-gated agent and replay-safe jobs." };

const OWNS = [
  ["Organizations, users, roles, seats", "Relationship traversal"],
  ["Integration state + token references", "Warm-path search (≤3 hops)"],
  ["Raw + normalized events (append-only)", "Neighborhood queries for account slices"],
  ["Campaigns, drafts, approvals", "Graph-derived influence features"],
  ["Jobs, audit log, billing state", "Temporal relationship projections"],
  ["Opportunities + attribution runs", "Everything here is rebuildable from the left column"],
];

const CONNECTOR = `interface Connector {
  provider: Provider;
  mode: "live" | "mock" | "fixture";
  getAuthorizationUrl(ctx): Promise<string>;     // state + PKCE (S256)
  exchangeCode(code, verifier): Promise<TokenSet>;
  refreshTokens(tokens): Promise<TokenSet>;
  sync(cursor?): AsyncIterable<SyncPage>;          // cursor-based, resumable
  verifyWebhook(req, secret, now): Promise<VerifiedWebhook>; // HMAC + ±5 min + replay
  normalize(event): Promise<NormalizedEvent[]>;    // the ONLY place provider shapes exist
  health(): Promise<ConnectorHealth>;
}

type Outcome<T> =
  | { kind: "success"; value: T }
  | { kind: "retryable_failure"; reason: string; retryAfterMs?: number }
  | { kind: "permanent_failure"; reason: string }
  | { kind: "approval_required"; reason: string; approvalId: string };`;

const TREE = `src/core/
  contracts/      Zod schemas + domain types (trust boundary)
  seed/           deterministic synthetic universe + raw-event generator
  ingest/         raw → stored (dedupe) → normalized
  integrations/   connector SDK, normalizers, CSV, webhooks, OAuth, Break-it scenarios
  identity/       resolution with confidence; ambiguous ≠ merged
  graph/          projection, checksums, warm paths, Cypher export
  signals/        warming, exec engagement, warm path, topic, champion risk
  attribution/    6 models + explainability contract
  content/        angle briefs, drafts, overlap + claim checks
  agents/         tool registry, static policy, runtime, evals
  jobs/           idempotent runner, backoff + jitter, DLQ
  observability/  structured logs with mandatory redaction
supabase/migrations/   schema + RLS
neo4j/                 constraints, projections, generated fixtures
tests/{unit,replay}/   unit + replay suites, incl. every failure scenario
scripts/               bench.ts, export-cypher.ts`;

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="Architecture" title="Postgres remembers. The graph is derived. Nothing is magic.">
        GROW AI starts as a modular monolith with background jobs. Integrations write raw events first. Everything else (normalized events, identities, the graph, signals, attribution) is a deterministic function of that log, so any of it can be thrown away and rebuilt to the same checksum.
      </PageHeader>
      <div className="mx-auto max-w-6xl space-y-16 px-4 md:px-6">
        <div className="card p-4 md:p-6">
          <ArchitectureDiagram />
        </div>

        <section className="grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-2xl font-semibold">Why Postgres and Neo4j</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
              Relationship questions (who do we know who knows them, within three hops, ranked by recency and strength) are graph queries. Everything else is transactional state with permissions. So Postgres owns the truth and Neo4j owns a projection of it. If the graph store goes down, the app keeps serving the last projection and catches up from events. You can watch that happen in the demo.
            </p>
          </div>
          <div className="card overflow-hidden">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-line bg-surface-2 text-[11px] uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Postgres owns</th>
                  <th className="px-4 py-2.5 font-medium">Graph owns (derived)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {OWNS.map(([a, b]) => (
                  <tr key={a}>
                    <td className="px-4 py-2.5">{a}</td>
                    <td className="px-4 py-2.5 text-ink-2">{b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-2xl font-semibold">Failure philosophy</h2>
            <ul className="mt-4 space-y-3 text-[14.5px] leading-relaxed text-ink-2">
              <li>→ Never write a webhook into the graph before the raw event is persisted.</li>
              <li>→ Every external event carries a provider ID, payload hash, received-at and processing status.</li>
              <li>→ Every graph mutation is derived, versioned and replayable. Replaying the whole corpus twice yields zero new normalized events and the same checksum.</li>
              <li>→ Every side effect returns a typed outcome and carries an idempotency key. Agents never get to decide policy.</li>
              <li>→ Partial failure is shown, not hidden: dead letters, projection lag and reauth states all have UI.</li>
            </ul>
          </div>
          <div>
            <h2 className="font-display text-2xl font-semibold">Connector contract</h2>
            <pre className="mt-4 overflow-x-auto rounded-xl bg-[#0b1220] p-5 font-mono text-[11.5px] leading-relaxed text-[#d6dde8]">{CONNECTOR}</pre>
          </div>
        </section>

        <section className="grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-2xl font-semibold">Warm-path scoring</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-2">Rule-based on purpose. Components are stored and shown; no opaque learned score ships until there is real data to evaluate one.</p>
            <pre className="mt-4 overflow-x-auto rounded-xl border border-line bg-surface p-5 font-mono text-[12px] leading-relaxed">{`path_score =
    relationship_strength × 0.35   // weakest link on the path
  + recency_score         × 0.25   // e^(−age/45d) of the stalest hop
  + source_diversity      × 0.15   // distinct sources / 3
  + role_relevance        × 0.15   // VP 1.0 · C-level 0.9 · Director 0.8 …
  + engagement_momentum   × 0.10   // target's last-14-day activity`}</pre>
          </div>
          <div>
            <h2 className="font-display text-2xl font-semibold">Repository</h2>
            <pre className="mt-4 overflow-x-auto rounded-xl border border-line bg-surface p-5 font-mono text-[11.5px] leading-relaxed text-ink-2">{TREE}</pre>
          </div>
        </section>

        <section className="card p-6">
          <h2 className="font-display text-2xl font-semibold">What is live, what is written, what is next</h2>
          <div className="mt-4 grid gap-6 text-[13.5px] md:grid-cols-3">
            <div>
              <p className="font-medium text-positive">Shipped and tested</p>
              <p className="mt-1 text-ink-2">Event backbone, identity resolution, graph projection, warm paths, signals, six attribution models, content engine, agent runtime with policy gate, job runner, webhook verification, OAuth/PKCE builder, token encryption, CSV connector, failure scenarios, public demo.</p>
            </div>
            <div>
              <p className="font-medium text-warning">Written, not yet run live</p>
              <p className="mt-1 text-ink-2">Supabase migrations + RLS policies. Neo4j constraints and the generated MERGE fixture. Both are code-reviewed artifacts. The deployed demo runs the in-process reference implementation instead.</p>
            </div>
            <div>
              <p className="font-medium text-muted">Not started</p>
              <p className="mt-1 text-ink-2">Supabase auth + persistence, a durable job runtime (trigger.dev), Stripe test-mode checkout, MCP server, model-backed draft writer.</p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
