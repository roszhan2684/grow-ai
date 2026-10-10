import Link from "next/link";
import { GraphHero } from "@/components/site/GraphHero";
import { AttributionMorph } from "@/components/site/AttributionMorph";
import { CtaBand } from "@/components/site/SiteChrome";
import { Sparkline, Meter, Badge } from "@/components/ui";
import { buildGraphView } from "@/lib/graph-view";
import { siteWorkspace } from "@/lib/site";
import { personName } from "@/core/workspace";
import { runAgent } from "@/core/agents/runtime";
import { PERSONA_STRATEGY } from "@/core/content/engine";
import { WARM_PATH_WEIGHTS } from "@/core/graph/warmPaths";
import { SIGNAL_LABELS } from "@/core/signals/detect";

const ACME = "co_acme-robotics";
const PX = "px-5 md:px-10 xl:px-16";

const FAQ = [
  ["What data does GROW AI use?", "Your CRM contacts and deals, meetings, Slack introductions and engagement with your team's posts. Everything is stored as an event history, so every score and recommendation can be traced back to what actually happened."],
  ["Does the AI agent act on its own?", "No. The agent can research, plan and draft. Anything that leaves your workspace, like a CRM note, a scheduled post or a message, waits for a person to approve it, runs exactly once, and is written to the audit log."],
  ["How is this different from last-touch attribution?", "GROW AI compares six attribution models side by side over the same touches, including a graph-assisted model that weighs warm introductions and repeated engagement. It always shows which touches were excluded and why, and it never presents credit as proof of cause."],
  ["How long does setup take?", "Import your CRM contacts from CSV and connect your sources. The relationship graph, warm paths and signals build automatically from the events that come in."],
  ["Who is it for?", "B2B teams where trust drives revenue: founders and CEOs building category authority, sales leaders looking for warm paths, and marketing leaders coordinating executive narratives and proving pipeline impact."],
];

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
      <section className="relative w-full overflow-hidden border-b border-line">
        <div className="grid-bg pointer-events-none absolute inset-0 opacity-70" aria-hidden />
        <div className={`relative grid w-full items-center gap-12 ${PX} pt-16 pb-20 lg:grid-cols-[0.9fr_1.1fr] lg:pt-24 lg:pb-28`}>
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-1.5 text-[13px] text-ink-2">
              <span className="size-1.5 rounded-full bg-accent" aria-hidden />
              Relationship intelligence for B2B growth
            </p>
            <h1 className="font-display mt-6 text-[48px] font-bold leading-[1.0] text-ink md:text-[72px] xl:text-[84px]">Turn B2B relationships into a system.</h1>
            <p className="mt-6 max-w-2xl text-[18px] leading-relaxed text-ink-2 md:text-[20px]">
              GROW AI maps the people, posts, introductions and meetings behind your pipeline into one living graph. It tells you which accounts are warming, the warmest way in, and which touches earned the deal, with the evidence behind every answer.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/contact" className="rounded-xl bg-ink px-6 py-3.5 text-[15px] font-semibold text-white hover:bg-[#1e293b]">
                Book a demo
              </Link>
              <Link href="/app" className="rounded-xl border border-line-strong bg-surface px-6 py-3.5 text-[15px] font-semibold text-ink hover:bg-surface-2">
                See it live →
              </Link>
            </div>
            <a href="#overview" className="mt-6 inline-flex items-center gap-2 text-[14px] font-medium text-accent hover:underline">
              ▶ Watch the 24-second overview
            </a>
          </div>
          <GraphHero nodes={view.nodes} edges={view.edges} eventTimes={ws.resolved.map((e) => e.occurredAt)} now={ws.now} path={best.nodeIds} pathLabel={`${best.nodeIds.map((id) => personName(ws, id)).join(" → ")} · score ${best.score.toFixed(2)}`} />
        </div>
      </section>

      {/* ───────── Three outcomes ───────── */}
      <section className="w-full bg-surface">
        <div className="grid w-full divide-y divide-line border-b border-line md:grid-cols-3 md:divide-x md:divide-y-0">
          {[
            ["01", "Know who's warming up", "Account-warming signals fire when several people from one account engage in a short window, so your team acts while interest is real."],
            ["02", "Find the warmest way in", "Ranked relationship paths from your team to the buyer, scored on strength, recency and role. One click shows the introduction or meeting behind every hop."],
            ["03", "Prove what moved the deal", "Compare last-touch with graph-assisted attribution on the same opportunity and see the relationship work that actually built pipeline."],
          ].map(([n, t, d]) => (
            <div key={n} className={`${PX} py-12 md:py-14`}>
              <p className="font-mono text-[12px] text-accent">{n}</p>
              <h2 className="font-display mt-3 text-[28px] font-semibold leading-tight">{t}</h2>
              <p className="mt-3 max-w-md text-[15.5px] leading-relaxed text-ink-2">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ───────── Overview film ───────── */}
      <section id="overview" className="w-full scroll-mt-16 bg-ink">
        <div className={`grid w-full items-center gap-10 ${PX} py-20 lg:grid-cols-[0.7fr_1.3fr]`}>
          <div>
            <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-[#5eead4]">Overview</p>
            <h2 className="font-display mt-4 text-[40px] font-bold leading-tight text-white md:text-[52px]">GROW AI in 24 seconds.</h2>
            <p className="mt-4 max-w-md text-[16px] leading-relaxed text-white/70">One graph, the warmest way in, an agent that asks before it acts, and attribution that credits the relationship.</p>
          </div>
          <video className="w-full overflow-hidden rounded-2xl border border-white/10 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.8)]" controls preload="metadata" poster="/grow-ai-launch.jpg" aria-label="GROW AI 24-second overview">
            <source src="/grow-ai-launch.mp4" type="video/mp4" />
          </video>
        </div>
      </section>

      {/* ───────── Product tour (live components) ───────── */}
      <section className="w-full">
        <div className={`w-full ${PX} pt-24 pb-10`}>
          <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-accent">The product</p>
          <h2 className="font-display mt-4 max-w-4xl text-[40px] font-bold leading-tight md:text-[56px]">Everything your team needs to grow through relationships.</h2>
        </div>

        <div className={`grid w-full items-center gap-10 border-t border-line ${PX} py-16 lg:grid-cols-2`}>
          <div>
            <Badge tone="accent">Account intelligence</Badge>
            <h3 className="font-display mt-4 text-[32px] font-semibold leading-tight">See which accounts are heating up, and why.</h3>
            <p className="mt-3 max-w-xl text-[16px] leading-relaxed text-ink-2">Stakeholders, engagement over time, open opportunities and live signals in one view. Every signal tells you what changed, why it matters and what to do next.</p>
          </div>
          <div className="card p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted">Account</p>
                <p className="font-display mt-1 text-2xl font-semibold">{acme.company.name}</p>
                <p className="text-[13px] text-muted">
                  {acme.engagement14d} interactions from {acme.engagedPeople30d} people in 14 days · {acme.opportunity?.stage}
                </p>
              </div>
              <div className="text-right">
                <p className="tnum font-display text-5xl font-semibold">{acme.warmth}</p>
                <p className="text-[11px] text-muted">warmth index</p>
              </div>
            </div>
            <div className="mt-5">
              <Sparkline values={acme.weekly} width={620} height={64} />
            </div>
            <div className="mt-5 flex flex-wrap gap-1.5">
              {acme.signals.slice(0, 4).map((s) => (
                <Badge key={s.id} tone="accent">
                  {SIGNAL_LABELS[s.type]}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className={`grid w-full items-center gap-10 border-t border-line bg-surface ${PX} py-16 lg:grid-cols-2`}>
          <div className="card p-6 lg:order-2">
            <p className="text-[11px] uppercase tracking-wide text-muted">Warmest path into {acme.company.name}</p>
            <p className="font-display mt-1 text-2xl font-semibold">{best.nodeIds.map((id) => personName(ws, id)).join(" → ")}</p>
            <p className="text-[13px] text-muted">score {best.score.toFixed(2)} · built from an advisor&apos;s introduction and a meeting</p>
            <div className="mt-5 space-y-3">
              {(Object.keys(WARM_PATH_WEIGHTS) as (keyof typeof WARM_PATH_WEIGHTS)[]).map((k) => (
                <div key={k}>
                  <div className="mb-1 flex justify-between text-[12.5px]">
                    <span className="capitalize text-ink-2">{k.replace(/_/g, " ")}</span>
                    <span className="tnum font-mono">{best.components[k].toFixed(2)}</span>
                  </div>
                  <Meter value={best.components[k]} label={k} />
                </div>
              ))}
            </div>
          </div>
          <div className="lg:order-1">
            <Badge tone="accent">Warm paths</Badge>
            <h3 className="font-display mt-4 text-[32px] font-semibold leading-tight">The warmest way in, with receipts.</h3>
            <p className="mt-3 max-w-xl text-[16px] leading-relaxed text-ink-2">GROW AI ranks every route from your team to the buyer within three hops. Each score breaks down into strength, recency, source diversity, role and momentum, so reps trust the recommendation and know who to ask.</p>
          </div>
        </div>

        <div className={`grid w-full items-center gap-10 border-t border-line ${PX} py-16 lg:grid-cols-2`}>
          <div>
            <Badge tone="accent">Coordinated campaigns</Badge>
            <h3 className="font-display mt-4 text-[32px] font-semibold leading-tight">One theme. Three executive voices. Zero duplicate posts.</h3>
            <p className="mt-3 max-w-xl text-[16px] leading-relaxed text-ink-2">Give your CEO, sales leader and marketing leader distinct angles on the same narrative. Drafts are checked for overlap, forbidden claims and unsupported numbers before anyone approves them.</p>
          </div>
          <div className="card p-6">
            <p className="text-[11px] uppercase tracking-wide text-muted">Campaign · “{ws.campaigns[0]!.theme}”</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {drafts.map((d) => (
                <div key={d.id} className="rounded-xl border border-line p-4">
                  <p className="text-[12.5px] font-semibold">{PERSONA_STRATEGY[d.persona].label}</p>
                  <p className="text-[11px] text-muted">{d.angle.replace("_", " ")}</p>
                  <p className="mt-2 line-clamp-4 text-[13px] leading-snug text-ink-2">{d.title}</p>
                  <p className="mt-3 font-mono text-[10.5px] text-positive">
                    ✓ {d.checks.filter((c) => c.passed).length}/{d.checks.length} checks
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={`grid w-full items-center gap-10 border-t border-line bg-surface ${PX} py-16 lg:grid-cols-2`}>
          <div className="overflow-hidden rounded-2xl border border-[#1e293b] bg-[#0b1220] text-[#d6dde8] lg:order-2">
            <div className="border-b border-white/10 px-5 py-3 font-mono text-[12px] text-white/60">
              <span className="text-[#99f6e4]">Ask</span> {run.prompt}
            </div>
            <ol className="space-y-2.5 px-5 py-4 font-mono text-[12px]">
              {run.steps.map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span className={s.status === "ok" ? "text-[#99f6e4]" : "text-[#fcd34d]"}>{s.status === "ok" ? "✓" : "⏸"}</span>
                  <span className="min-w-0">
                    <span className="text-white">{s.tool.replace(/_/g, " ")}</span>
                    <span className="block truncate text-white/55">{s.summary}</span>
                  </span>
                </li>
              ))}
            </ol>
            <p className="border-t border-white/10 px-5 py-4 text-[14px] leading-relaxed text-white">{run.summary}</p>
          </div>
          <div className="lg:order-1">
            <Badge tone="accent">Growth agent</Badge>
            <h3 className="font-display mt-4 text-[32px] font-semibold leading-tight">Ask “what should we do next?” and get an answer you can check.</h3>
            <p className="mt-3 max-w-xl text-[16px] leading-relaxed text-ink-2">The agent researches the account, the relationship graph, your CRM and campaigns, then recommends a sequence. Every step is visible, every recommendation cites its evidence, and nothing leaves your workspace without approval.</p>
          </div>
        </div>

        <div className={`grid w-full items-center gap-10 border-t border-line ${PX} py-16 lg:grid-cols-2`}>
          <div>
            <Badge tone="accent">Attribution</Badge>
            <h3 className="font-display mt-4 text-[32px] font-semibold leading-tight">Credit the relationship, not just the last click.</h3>
            <p className="mt-3 max-w-xl text-[16px] leading-relaxed text-ink-2">Switch between first touch, last touch, linear, time decay, position based and graph assisted. See exactly which touches counted, which were excluded, and why. Honest about what attribution can and can&apos;t prove.</p>
          </div>
          <AttributionMorph rows={rows} />
        </div>
      </section>

      {/* ───────── How it works ───────── */}
      <section className="w-full border-y border-line bg-accent-soft/40">
        <div className={`w-full ${PX} py-24`}>
          <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-accent">How it works</p>
          <h2 className="font-display mt-4 max-w-3xl text-[40px] font-bold leading-tight md:text-[52px]">Live in four steps.</h2>
          <ol className="mt-12 grid w-full gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              ["Connect", "Import CRM contacts and deals, and connect Slack and your engagement sources. Every event is captured and de-duplicated."],
              ["Map", "GROW AI resolves who is who across sources and builds your relationship graph automatically."],
              ["Act", "Signals, warm paths, campaigns and the agent turn the graph into a clear next step for every account."],
              ["Measure", "Attribution connects posts, introductions and meetings to opportunities and revenue."],
            ].map(([t, d], i) => (
              <li key={t} className="card p-7">
                <span className="font-mono text-[12px] text-muted">0{i + 1}</span>
                <p className="font-display mt-3 text-[26px] font-semibold">{t}</p>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ───────── Teams ───────── */}
      <section className="w-full">
        <div className={`w-full ${PX} py-24`}>
          <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-accent">Built for every team</p>
          <h2 className="font-display mt-4 max-w-3xl text-[40px] font-bold leading-tight md:text-[52px]">One system for the whole go-to-market team.</h2>
          <div className="mt-12 grid w-full gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              ["Founders & CEOs", "Build category authority and see which relationships are warming.", "founders"],
              ["Sales", "Find warm paths and turn engagement into conversations.", "sales"],
              ["Marketing", "Coordinate executive narratives and measure pipeline impact.", "marketing"],
              ["RevOps", "Keep data clean, connectors healthy and every action audited.", "revops"],
            ].map(([t, d, a]) => (
              <Link key={a} href={`/solutions#${a}`} className="card group p-7 transition-colors hover:border-line-strong">
                <p className="font-display text-[24px] font-semibold">{t}</p>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{d}</p>
                <span className="mt-5 inline-block text-[14px] font-medium text-accent group-hover:underline">Learn more →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── Trust ───────── */}
      <section className="w-full border-t border-line bg-surface">
        <div className={`grid w-full gap-12 ${PX} py-24 lg:grid-cols-[0.8fr_1.2fr]`}>
          <div>
            <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-accent">Trust & control</p>
            <h2 className="font-display mt-4 text-[40px] font-bold leading-tight md:text-[48px]">AI that asks before it acts.</h2>
            <Link href="/security" className="mt-6 inline-block text-[15px] font-medium text-accent hover:underline">
              Security overview →
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ["Human approval", "CRM writes, scheduled posts and outbound messages always wait for a person."],
              ["Full audit log", "Approvals, permission changes, integration changes and data repairs are recorded."],
              ["Encrypted credentials", "Integration tokens are encrypted at rest and never written to logs."],
              ["Role-based access", "Owner, admin, operator, member and viewer roles with seat management."],
            ].map(([t, d]) => (
              <div key={t} className="rounded-2xl border border-line p-6">
                <p className="font-display text-[20px] font-semibold">{t}</p>
                <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── FAQ ───────── */}
      <section className="w-full border-t border-line">
        <div className={`grid w-full gap-12 ${PX} py-24 lg:grid-cols-[0.8fr_1.2fr]`}>
          <h2 className="font-display text-[40px] font-bold leading-tight md:text-[48px]">Questions, answered.</h2>
          <div className="divide-y divide-line border-y border-line">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[18px] font-semibold">
                  {q}
                  <span className="text-accent transition-transform group-open:rotate-45" aria-hidden>
                    +
                  </span>
                </summary>
                <p className="mt-3 max-w-3xl text-[15.5px] leading-relaxed text-ink-2">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
