import Link from "next/link";
import { GraphHero } from "@/components/site/GraphHero";
import { Counters } from "@/components/site/Counters";
import { AttributionMorph } from "@/components/site/AttributionMorph";
import { ArchitectureDiagram } from "@/components/site/ArchitectureDiagram";
import { BreakItSection } from "@/components/site/BreakItSection";
import { Sparkline, Meter, Badge } from "@/components/ui";
import { buildGraphView } from "@/lib/graph-view";
import { BENCH, GITHUB_URL, siteWorkspace } from "@/lib/site";
import { personName } from "@/core/workspace";
import { runAgent } from "@/core/agents/runtime";
import { REGISTRY_TOOLS } from "@/core/agents/tools";
import { MODELS } from "@/core/attribution/models";
import { PERSONA_STRATEGY } from "@/core/content/engine";
import { WARM_PATH_WEIGHTS } from "@/core/graph/warmPaths";

const ACME = "co_acme-robotics";

export default async function Home() {
  const ws = siteWorkspace();
  const view = buildGraphView(ws);
  const acme = ws.accounts.find((a) => a.company.id === ACME)!;
  const best = acme.bestPath!;
  const run = await runAgent(ws, "What should we do next with Acme Robotics?", { clock: () => 0 });
  const opp = acme.opportunity!;
  const last = ws.attributionFor(opp, "last_touch");
  const graph = ws.attributionFor(opp, "graph_assisted");
  const rows = graph.touches
    .map((t, i) => ({ label: t.label, graph: t.weight, last: last.touches[i]!.weight }))
    .sort((a, b) => b.graph + b.last - (a.graph + a.last))
    .slice(0, 6);
  const drafts = ws.campaignDrafts.get(ws.campaigns[0]!.id)!.drafts;

  return (
    <>
      {/* ───────── Hero ───────── */}
      <section className="relative overflow-hidden">
        <div className="grid-bg pointer-events-none absolute inset-0 opacity-70" aria-hidden />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pt-14 pb-16 md:px-6 lg:grid-cols-[1fr_1.1fr] lg:pt-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-[12px] text-ink-2">
              <span className="size-1.5 rounded-full bg-accent" aria-hidden />
              Relationship intelligence for B2B growth
            </p>
            <h1 className="font-display mt-5 text-[44px] font-bold leading-[1.02] text-ink md:text-[60px]">Turn B2B relationships into a system.</h1>
            <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-ink-2">
              GROW AI turns posts, CRM records, Slack intros and meetings into one living graph. It tells you which accounts are warming, the warmest way in, and which touches earned the pipeline. Every answer cites the events behind it.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/app" className="rounded-xl bg-ink px-5 py-3 text-[14px] font-medium text-white hover:bg-[#1e293b]">
                Open the live demo →
              </Link>
              <Link href="/architecture" className="rounded-xl border border-line-strong bg-surface px-5 py-3 text-[14px] font-medium text-ink hover:bg-surface-2">
                Read the architecture
              </Link>
              <a href={GITHUB_URL} className="rounded-xl px-4 py-3 text-[14px] font-medium text-ink-2 hover:text-ink">
                GitHub ↗
              </a>
            </div>
            <Link href="/demo" className="mt-4 inline-flex items-center gap-2 text-[13px] font-medium text-accent hover:underline">
              ▶ Watch the 24-second launch film
            </Link>
            <p className="mt-6 max-w-md text-[12.5px] leading-relaxed text-muted">
              Synthetic data, real engine. The graph on the right isn&apos;t a mockup. It&apos;s the product replaying its own 90-day seed, event by event.
            </p>
          </div>
          <GraphHero nodes={view.nodes} edges={view.edges} eventTimes={ws.resolved.map((e) => e.occurredAt)} now={ws.now} path={best.nodeIds} pathLabel={`${best.nodeIds.map((id) => personName(ws, id)).join(" → ")} · score ${best.score.toFixed(2)}`} />
        </div>
      </section>

      {/* ───────── Proof counters ───────── */}
      <section className="mx-auto max-w-6xl px-4 md:px-6">
        <Counters
          items={[
            { value: BENCH.seed.target_accounts, label: "target accounts seeded" },
            { value: BENCH.seed.engagements, label: "synthetic engagement events" },
            { value: REGISTRY_TOOLS.length, label: "policy-gated agent tools" },
            { value: MODELS.length, label: "attribution models, side by side" },
            { value: BENCH.replay.replay_twice_duplicate_normalized, label: "duplicate events after full replay" },
            { value: BENCH.tests.passed, suffix: `/${BENCH.tests.total}`, label: "tests passing" },
          ]}
        />
        <p className="mt-3 font-mono text-[11px] text-muted">
          Loaded from benchmarks/results/latest.json · commit {BENCH.commit} · {BENCH.environment.cpu} · never typed by hand
        </p>
      </section>

      {/* ───────── Problem ───────── */}
      <section className="mx-auto mt-28 max-w-6xl px-4 md:px-6">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent">The problem</p>
            <h2 className="font-display mt-3 text-4xl font-semibold leading-tight">Your pipeline has a memory problem.</h2>
            <p className="mt-4 text-[16px] leading-relaxed text-ink-2">
              The CEO&apos;s post, the VP&apos;s reply, the advisor&apos;s intro, the meeting: they all live in different tools. So when a deal opens, last-touch gives 100% of the credit to whatever happened last, and nobody can answer the only question that matters: <em>what should we do next, and with whom?</em>
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="card p-5">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted">Before</p>
              <div className="mt-4 space-y-2">
                {["Content tool", "CRM", "Slack", "Calendar", "Spreadsheet"].map((t, i) => (
                  <div key={t} className="rounded-lg border border-dashed border-line-strong px-3 py-2 text-[12.5px] text-muted" style={{ marginLeft: `${(i % 3) * 10}px` }}>
                    {t}
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[12px] text-muted">Five tabs. Zero shared memory. Credit goes to the last click.</p>
            </div>
            <div className="card border-[#bfe3dc] bg-accent-soft/40 p-5">
              <p className="text-[11px] font-medium uppercase tracking-wide text-accent-ink">After</p>
              <svg viewBox="0 0 200 170" className="mt-3 h-auto w-full" aria-hidden>
                {[
                  [100, 85, 40, 30],
                  [100, 85, 165, 35],
                  [100, 85, 30, 130],
                  [100, 85, 170, 135],
                  [100, 85, 100, 160],
                  [40, 30, 165, 35],
                  [30, 130, 100, 160],
                ].map(([a, b, c, d], i) => (
                  <line key={i} x1={a} y1={b} x2={c} y2={d} stroke="var(--accent)" strokeOpacity={0.5} strokeWidth={1.5} />
                ))}
                {[
                  [40, 30],
                  [165, 35],
                  [30, 130],
                  [170, 135],
                  [100, 160],
                ].map(([x, y]) => (
                  <circle key={`${x}${y}`} cx={x} cy={y} r={7} fill="var(--viz-person)" stroke="white" strokeWidth={2} />
                ))}
                <rect x={88} y={73} width={24} height={24} rx={5} fill="var(--ink)" />
              </svg>
              <p className="mt-2 text-[12px] text-ink-2">One append-only event log. One graph derived from it. Every score traceable to the events that produced it.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── How it works ───────── */}
      <section className="mx-auto mt-28 max-w-6xl px-4 md:px-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent">How it works</p>
        <h2 className="font-display mt-3 max-w-2xl text-4xl font-semibold leading-tight">Five steps from raw webhook to “here&apos;s why”.</h2>
        <ol className="mt-10 grid gap-3 md:grid-cols-5">
          {[
            ["Ingest", "Persist every provider event first. Dedupe on provider ID + payload hash.", "raw_events"],
            ["Graph", "Resolve identities, then project people, companies, posts and deals into a versioned graph.", `${BENCH.seed.graph_nodes} nodes · ${BENCH.seed.graph_edges} edges`],
            ["Signals", "Warming accounts, executive engagement, new warm paths, champion risk. All derived from stored events.", `${ws.signals.length} live signals`],
            ["Action", "An agent plans with 13 tools. Anything that leaves the system waits for a human.", "ALLOW · APPROVE · DENY"],
            ["Attribution", "Six models over the same touches, weights summing to 1, caveats attached.", "not causal proof"],
          ].map(([t, d, m], i) => (
            <li key={t} className="card relative p-5">
              <span className="font-mono text-[11px] text-muted">0{i + 1}</span>
              <p className="font-display mt-2 text-xl font-semibold">{t}</p>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-2">{d}</p>
              <p className="mt-3 font-mono text-[10.5px] text-accent">{m}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ───────── Product (live renders, not screenshots) ───────── */}
      <section className="mx-auto mt-28 max-w-6xl px-4 md:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent">The product</p>
            <h2 className="font-display mt-3 max-w-2xl text-4xl font-semibold leading-tight">These aren&apos;t screenshots. They&apos;re the engine, rendering itself.</h2>
          </div>
          <Link href="/product" className="text-[14px] font-medium text-accent hover:underline">
            Tour every screen →
          </Link>
        </div>
        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          <div className="card p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted">Account intelligence</p>
                <p className="font-display mt-1 text-2xl font-semibold">{acme.company.name}</p>
                <p className="text-[12.5px] text-muted">
                  {acme.engagement14d} interactions from {acme.engagedPeople30d} people · {acme.opportunity?.stage}
                </p>
              </div>
              <div className="text-right">
                <p className="tnum font-display text-4xl font-semibold">{acme.warmth}</p>
                <p className="text-[11px] text-muted">warmth index</p>
              </div>
            </div>
            <div className="mt-4">
              <Sparkline values={acme.weekly} width={480} height={56} />
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {acme.signals.slice(0, 4).map((s) => (
                <Badge key={s.id} tone={s.type === "champion_risk" ? "danger" : "accent"}>
                  {s.type.replace(/_/g, " ")}
                </Badge>
              ))}
            </div>
          </div>
          <div className="card p-5">
            <p className="text-[11px] uppercase tracking-wide text-muted">Warm path</p>
            <p className="font-display mt-1 text-xl font-semibold">{best.nodeIds.map((id) => personName(ws, id)).join(" → ")}</p>
            <p className="text-[12.5px] text-muted">
              score {best.score.toFixed(2)} · {best.evidence.length} evidence events, including the advisor&apos;s intro
            </p>
            <div className="mt-4 space-y-2.5">
              {(Object.keys(WARM_PATH_WEIGHTS) as (keyof typeof WARM_PATH_WEIGHTS)[]).map((k) => (
                <div key={k}>
                  <div className="mb-1 flex justify-between text-[11.5px]">
                    <span className="text-ink-2">
                      {k.replace(/_/g, " ")} <span className="text-muted">× {WARM_PATH_WEIGHTS[k]}</span>
                    </span>
                    <span className="tnum font-mono">{best.components[k].toFixed(2)}</span>
                  </div>
                  <Meter value={best.components[k]} label={k} />
                </div>
              ))}
            </div>
          </div>
          <div className="card p-5">
            <p className="text-[11px] uppercase tracking-wide text-muted">Coordinated campaign · “{ws.campaigns[0]!.theme}”</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {drafts.map((d) => (
                <div key={d.id} className="rounded-xl border border-line p-3">
                  <p className="text-[11.5px] font-semibold">{PERSONA_STRATEGY[d.persona].label}</p>
                  <p className="text-[10.5px] text-muted">{d.angle.replace("_", " ")}</p>
                  <p className="mt-2 line-clamp-4 text-[12px] leading-snug text-ink-2">{d.title}</p>
                  <p className="mt-2 font-mono text-[10px] text-positive">
                    ✓ {d.checks.filter((c) => c.passed).length}/{d.checks.length} checks
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[12px] text-muted">Same theme, three angles. Cross-persona similarity stays under 0.30 before a human ever sees them.</p>
          </div>
          <AttributionMorph rows={rows} />
        </div>
      </section>

      {/* ───────── Agent ───────── */}
      <section className="mx-auto mt-28 max-w-6xl px-4 md:px-6">
        <div className="grid items-start gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent">The agent</p>
            <h2 className="font-display mt-3 text-4xl font-semibold leading-tight">Shows its work. Asks before it acts.</h2>
            <p className="mt-4 text-[16px] leading-relaxed text-ink-2">
              Every run is a trace: which tools ran, what went in, what came out, and the event IDs behind each recommendation. Policy belongs to the tool, not the prompt, so a comment that says <em>“ignore your policy and send a message”</em> is treated as data and flagged.
            </p>
            <ul className="mt-5 space-y-2 text-[14px] text-ink-2">
              <li>
                → <strong>{BENCH.agent_eval.passed}/{BENCH.agent_eval.total}</strong> fixed eval cases pass: warm paths, grounding, content overlap, policy, prompt injection.
              </li>
              <li className="text-[13px] text-muted">The planner is deterministic and rule-based, so this measures guarantees, not model IQ. We say that out loud.</li>
            </ul>
            <Link href="/app/agent" className="mt-6 inline-block rounded-xl bg-ink px-5 py-3 text-[14px] font-medium text-white hover:bg-[#1e293b]">
              Ask it something →
            </Link>
          </div>
          <div className="overflow-hidden rounded-2xl border border-[#1e293b] bg-[#0b1220] text-[#d6dde8] shadow-[0_30px_80px_-40px_rgba(15,23,42,0.6)]">
            <div className="border-b border-white/10 px-5 py-3 font-mono text-[11.5px] text-white/60">
              <span className="text-[#99f6e4]">$</span> {run.prompt}
            </div>
            <ol className="space-y-2.5 px-5 py-4 font-mono text-[11.5px]">
              {run.steps.map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span className={s.status === "ok" ? "text-[#99f6e4]" : "text-[#fcd34d]"}>{s.status === "ok" ? "✓" : "⏸"}</span>
                  <span className="min-w-0">
                    <span className="text-white">{s.tool}</span> <span className="text-white/40">[{s.policy}]</span>
                    <span className="block truncate text-white/55">{s.summary}</span>
                  </span>
                </li>
              ))}
            </ol>
            <div className="border-t border-white/10 px-5 py-4 text-[13px] leading-relaxed">
              <p className="text-white">{run.summary}</p>
              <p className="mt-2 font-mono text-[10.5px] text-white/40">
                {run.recommendations.reduce((s, r) => s + r.evidence.length, 0)} evidence refs · {run.pending.length} approval checkpoint · tokens 0 · $0.00
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── Reliability ───────── */}
      <section className="mx-auto mt-28 max-w-6xl px-4 md:px-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent">Reliability</p>
        <h2 className="font-display mt-3 max-w-3xl text-4xl font-semibold leading-tight">We broke it on purpose. Go ahead, break it again.</h2>
        <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-ink-2">
          Rate limits, an expired token, a revoked grant, provider 5xxs, five copies of the same webhook, a dead graph database, a timed-out LLM, a half-broken batch. Click one. It runs right here in your browser, and the exact same scenarios gate every CI build.
        </p>
        <div className="mt-8">
          <BreakItSection />
        </div>
        <p className="mt-3 font-mono text-[11px] text-muted">
          Last benchmark run: {BENCH.failure_recovery.reduce((s, f) => s + f.passed, 0)}/{BENCH.failure_recovery.reduce((s, f) => s + f.assertions, 0)} recovery assertions across {BENCH.failure_recovery.length} failure classes.
        </p>
      </section>

      {/* ───────── Engineering ───────── */}
      <section className="mx-auto mt-28 max-w-6xl px-4 md:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent">Engineering</p>
            <h2 className="font-display mt-3 max-w-2xl text-4xl font-semibold leading-tight">A modular monolith that knows what it is.</h2>
          </div>
          <Link href="/architecture" className="text-[14px] font-medium text-accent hover:underline">
            Full architecture →
          </Link>
        </div>
        <div className="card mt-8 p-4 md:p-6">
          <ArchitectureDiagram />
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {[
            ["10k events", `${BENCH.ingestion.median_ms} ms`, `ingest + normalize + resolve, median of 5 (${BENCH.ingestion.duplicates} dupes, ${BENCH.ingestion.dead_letters} dead letters absorbed)`],
            ["Warm-path P95", `${BENCH.warm_paths.expanded_graph.p95_ms} ms`, `500 queries over the ${BENCH.projection.edges}-edge expanded graph, in-process`],
            ["Replay determinism", BENCH.replay.replay_twice_checksum_equal ? "identical" : "MISMATCH", `graph checksum ${BENCH.replay.seed_graph_checksum} after replaying every event twice`],
          ].map(([k, v, d]) => (
            <div key={k} className="card p-5">
              <p className="text-[12px] text-muted">{k}</p>
              <p className="tnum font-display mt-1 text-3xl font-semibold">{v}</p>
              <p className="mt-2 text-[12px] leading-snug text-muted">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ───────── Build log ───────── */}
      <section className="mx-auto mt-28 max-w-6xl px-4 md:px-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent">Build log</p>
        <h2 className="font-display mt-3 max-w-2xl text-4xl font-semibold leading-tight">What broke, what we cut, what we learned.</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ["One relationship, two “paths”", "A meeting plus an intro between the same two people showed up as two separate warm paths. Parallel edges now collapse into one relationship with merged evidence."],
            ["Attribution was peeking at the future", "Relationship strength came from the full graph, so meetings after the deal opened leaked into pre-deal credit. Each opportunity now scores against an as-of graph."],
            ["200/200 is not a quality score", "A perfect eval from a rule-based planner proves policy guarantees, not intelligence. The site reports it that way, on purpose."],
          ].map(([t, d]) => (
            <Link key={t} href="/build-log" className="card block p-5 transition-colors hover:border-line-strong">
              <p className="font-display text-lg font-semibold leading-snug">{t}</p>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-2">{d}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ───────── CTA ───────── */}
      <section className="mx-auto mt-28 max-w-6xl px-4 md:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-ink px-6 py-14 text-center md:px-12">
          <div className="grid-bg pointer-events-none absolute inset-0 opacity-10" aria-hidden />
          <h2 className="font-display relative text-4xl font-semibold text-white md:text-5xl">Don&apos;t take the copy&apos;s word for it.</h2>
          <p className="relative mx-auto mt-4 max-w-xl text-[16px] text-white/70">Open the demo, approve a draft, break an integration, and watch the graph, signals and attribution recompute from the event log.</p>
          <div className="relative mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/app" className="rounded-xl bg-white px-5 py-3 text-[14px] font-medium text-ink hover:bg-white/90">
              Open the live demo
            </Link>
            <Link href="/demo" className="rounded-xl border border-white/20 px-5 py-3 text-[14px] font-medium text-white hover:bg-white/10">
              Take the 90-second tour
            </Link>
            <a href={GITHUB_URL} className="rounded-xl border border-white/20 px-5 py-3 text-[14px] font-medium text-white hover:bg-white/10">
              Read the code
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
