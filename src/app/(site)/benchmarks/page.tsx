import type { Metadata } from "next";
import { PageHeader } from "@/components/site/SiteChrome";
import { BENCH } from "@/lib/site";

export const metadata: Metadata = { title: "Benchmarks", description: "Reproducible benchmarks for ingestion, graph projection, warm paths, replay determinism, agent evals and failure recovery." };

function Table({ rows, head }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[520px] text-left text-[13px]">
        <thead className="border-b border-line bg-surface-2 text-[11px] uppercase tracking-wide text-muted">
          <tr>
            {head.map((h, i) => (
              <th key={h} className={`px-4 py-2.5 font-medium ${i > 0 ? "text-right" : ""}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} className={`px-4 py-2.5 ${j > 0 ? "tnum text-right font-mono text-[12.5px]" : ""}`}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Page() {
  const b = BENCH;
  return (
    <>
      <PageHeader eyebrow="Benchmarks" title="Small, honest, reproducible.">
        No “millions of users”. Every number on this page is read from <code className="font-mono text-[14px]">benchmarks/results/latest.json</code>, produced by <code className="font-mono text-[14px]">npm run bench</code>. If a number can&apos;t be reproduced, it doesn&apos;t get published.
      </PageHeader>
      <div className="mx-auto max-w-6xl space-y-12 px-4 md:px-6">
        <div className="card flex flex-wrap gap-x-8 gap-y-2 px-5 py-4 font-mono text-[12px] text-ink-2">
          <span>generated {b.generated_at.slice(0, 16).replace("T", " ")} UTC</span>
          <span>commit {b.commit}</span>
          <span>node {b.environment.node}</span>
          <span>
            {b.environment.cpu} · {b.environment.cores} cores
          </span>
          <span>{b.environment.platform}</span>
        </div>

        <section>
          <h2 className="font-display mb-4 text-2xl font-semibold">Seed corpus</h2>
          <Table
            head={["Entity", "Count"]}
            rows={[
              ["Raw events (incl. duplicates + 1 invalid)", b.seed.raw_events],
              ["Target accounts", b.seed.target_accounts],
              ["People", b.seed.people],
              ["Posts", b.seed.posts],
              ["Engagements", b.seed.engagements],
              ["Meetings", b.seed.meetings],
              ["Opportunities / closed won", `${b.seed.opportunities} / ${b.seed.closed_won}`],
              ["Graph nodes / edges", `${b.seed.graph_nodes} / ${b.seed.graph_edges}`],
              ["Full workspace build (median)", `${b.seed.workspace_build_median_ms} ms`],
            ]}
          />
        </section>

        <section className="grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="font-display mb-4 text-2xl font-semibold">Event ingestion · 10k events</h2>
            <Table
              head={["Metric", "Value"]}
              rows={[
                ["Events in", b.ingestion.events.toLocaleString("en-US")],
                ["Normalized", b.ingestion.normalized.toLocaleString("en-US")],
                ["Duplicates absorbed", b.ingestion.duplicates],
                ["Dead-lettered (invalid)", b.ingestion.dead_letters],
                ["Median wall time (5 runs)", `${b.ingestion.median_ms} ms`],
                ["Throughput", `${b.ingestion.events_per_sec.toLocaleString("en-US")} events/s`],
              ]}
            />
            <p className="mt-2 text-[12px] text-muted">Ingest + normalize + identity resolution, single process. Corpus = seed plus synthetic engagement with 5% duplicate deliveries and 1% invalid payloads.</p>
          </div>
          <div>
            <h2 className="font-display mb-4 text-2xl font-semibold">Graph projection rebuild</h2>
            <Table
              head={["Metric", "Value"]}
              rows={[
                ["Normalized events projected", b.projection.normalized_events.toLocaleString("en-US")],
                ["Nodes", b.projection.nodes],
                ["Edges", b.projection.edges.toLocaleString("en-US")],
                ["Median rebuild (5 runs)", `${b.projection.median_ms} ms`],
              ]}
            />
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="font-display mb-4 text-2xl font-semibold">Warm-path queries · 500 each</h2>
            <Table
              head={["Graph", "P50", "P95", "Max"]}
              rows={[
                ["Seed graph", `${b.warm_paths.seed_graph.p50_ms} ms`, `${b.warm_paths.seed_graph.p95_ms} ms`, `${b.warm_paths.seed_graph.max_ms} ms`],
                ["10k-event graph", `${b.warm_paths.expanded_graph.p50_ms} ms`, `${b.warm_paths.expanded_graph.p95_ms} ms`, `${b.warm_paths.expanded_graph.max_ms} ms`],
              ]}
            />
            <p className="mt-2 text-[12px] text-muted">In-process reference implementation over a prebuilt adjacency. Not a Neo4j measurement.</p>
          </div>
          <div>
            <h2 className="font-display mb-4 text-2xl font-semibold">Account page read model</h2>
            <Table
              head={["Samples", "P50", "P95"]}
              rows={[[b.account_page.samples, `${b.account_page.p50_ms} ms`, `${b.account_page.p95_ms} ms`]]}
            />
            <p className="mt-2 text-[12px] text-muted">{b.account_page.note}.</p>
          </div>
        </section>

        <section>
          <h2 className="font-display mb-4 text-2xl font-semibold">Replay determinism</h2>
          <Table
            head={["Check", "Result"]}
            rows={[
              ["Seed graph checksum", b.replay.seed_graph_checksum],
              ["Two builds → identical normalized + graph checksums", b.replay.seed_checksums_equal ? "✓ equal" : "✕ differ"],
              ["Replay every event twice → new normalized events", b.replay.replay_twice_duplicate_normalized],
              ["Replay twice → graph checksum unchanged", b.replay.replay_twice_checksum_equal ? "✓ equal" : "✕ differ"],
              ["10k corpus rebuild → checksum stable", b.replay.expanded_checksum_equal ? "✓ equal" : "✕ differ"],
            ]}
          />
        </section>

        <section className="grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="font-display mb-4 text-2xl font-semibold">Agent evaluation</h2>
            <Table head={["Suite", "Passed"]} rows={b.agent_eval.suites.map((s) => [s.suite.replace(/_/g, " "), `${s.passed}/${s.total}`])} />
            <p className="mt-2 text-[12px] text-muted">
              {b.agent_eval.planner}. A perfect score here verifies grounding, policy and injection guarantees. It is not evidence of model quality.
            </p>
          </div>
          <div>
            <h2 className="font-display mb-4 text-2xl font-semibold">Connector failure recovery</h2>
            <Table head={["Injected failure", "Assertions"]} rows={b.failure_recovery.map((f) => [f.kind.replace(/_/g, " "), `${f.passed}/${f.assertions}`])} />
          </div>
        </section>

        <section>
          <h2 className="font-display mb-4 text-2xl font-semibold">Reproduce</h2>
          <pre className="overflow-x-auto rounded-xl bg-[#0b1220] p-5 font-mono text-[12.5px] leading-relaxed text-[#d6dde8]">{`git clone https://github.com/roszhan2684/grow-ai && cd grow-ai
npm ci
npm test          # ${b.tests.passed}/${b.tests.total} tests in ${b.tests.files} files at commit ${b.commit}
npm run bench     # rewrites benchmarks/results/latest.json`}</pre>
        </section>
      </div>
    </>
  );
}
