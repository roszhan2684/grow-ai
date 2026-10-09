import type { Metadata } from "next";
import { PageHeader } from "@/components/site/SiteChrome";

export const metadata: Metadata = { title: "Changelog" };

const RELEASES = [
  {
    v: "0.1.0",
    date: "Oct 2026",
    items: [
      "Event backbone: append-only raw events, dedupe on provider ID + payload hash, dead letters with readable causes",
      "Identity resolution with confidence; ambiguous identities go to a manual merge queue",
      "Graph projection (8 node labels, 11 relationship types), checksums, Cypher export",
      "Warm-path search with five-component explainable scoring and path evolution",
      "Signals: account warming, executive engagement, warm path emerged, topic resonance, champion risk, integration degradation",
      "Attribution: six models, as-of graph per opportunity, exclusions with reasons",
      "Coordinated content engine: angle briefs, overlap + forbidden-claim + unsupported-number + style checks",
      "Agent runtime: 13-tool registry, static approval matrix, idempotent approvals, traces, 200-case eval set",
      "Integrations: CSV connector, OAuth + PKCE builder, signed webhook endpoint, token encryption, redacting logger",
      "Reliability: idempotent job runner, backoff + jitter, Retry-After, reauth, reconciliation, eight Break-it scenarios",
      "Public site, live demo and reproducible benchmarks",
    ],
  },
];

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="Changelog" title="Shipped." />
      <div className="mx-auto max-w-3xl px-4 md:px-6">
        {RELEASES.map((r) => (
          <article key={r.v} className="card p-6">
            <div className="flex items-baseline gap-3">
              <h2 className="font-display text-2xl font-semibold">v{r.v}</h2>
              <span className="font-mono text-[12px] text-muted">{r.date}</span>
            </div>
            <ul className="mt-4 space-y-2 text-[14px] text-ink-2">
              {r.items.map((i) => (
                <li key={i}>+ {i}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </>
  );
}
