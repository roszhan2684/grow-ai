import type { Metadata } from "next";
import { PageHeader } from "@/components/site/SiteChrome";

export const metadata: Metadata = { title: "Build log", description: "Failures, tradeoffs and lessons from building GROW AI." };

const ENTRIES = [
  {
    tag: "Determinism",
    title: "Same events, same code, different checksum: Node vs. the browser",
    body: [
      "Hydration started failing on three pages. The server-rendered graph checksum was 121f4cd8… and the browser's was 181db3ea… for the exact same seed. I bundled the engine, ran it in Node and in Chromium, and diffed every edge: relationship strength 0.15351827510938598 in Node, …587 in Chrome. Math.exp isn't bit-identical across V8 versions.",
      "Fix: derived floats (strength, confidence, recency) are quantized to 1e-9 before they're stored or hashed. A golden-checksum test now pins the projection, and the claim “replays are deterministic” holds across engines, not just across runs.",
    ],
  },
  {
    tag: "Graph model",
    title: "One relationship showed up as two warm paths",
    body: [
      "The first warm-path search walked raw edges. Maya and Tomas were connected by a KNOWS edge (from the advisor's intro) and a MET_WITH edge (from the meeting), so the ranking listed “Maya → Tomas” twice with different scores. That's noise a VP of Sales would notice in five seconds.",
      "Fix: before traversal, every KNOWS / CONNECTED_TO / MET_WITH edge between the same two people collapses into one relationship. Its strength comes from the summed interaction weight, and sources and evidence are the union. Source diversity now means something (social + Slack + HubSpot on one hop), and the CEO → VP Engineering path went from two entries at 0.73 and 0.72 to one at 0.87.",
    ],
  },
  {
    tag: "Attribution",
    title: "Attribution was quietly peeking at the future",
    body: [
      "Graph-assisted attribution multiplies each touch by the person's relationship strength. The first version read that strength from the current graph, which already contained a meeting that happened after the opportunity opened. Pre-deal touches were getting credit for warmth that didn't exist yet.",
      "Fix: each opportunity is scored against an as-of projection built only from events up to its open date. That's cheap because the projection is a pure function of the event log. Touches after the open date are listed as excluded, with the reason, rather than silently dropped.",
    ],
  },
  {
    tag: "Signals",
    title: "Fourteen executive alerts is zero executive alerts",
    body: [
      "The executive-engagement rule (director+ engages twice in 30 days) fired 14 times on the seed. Every one was technically true, and together they were useless.",
      "Fix: one executive signal per account, for the most engaged decision-maker. The rule stays explainable and the inbox stays readable. Signal volume is a product decision, not just a threshold.",
    ],
  },
  {
    tag: "Agent",
    title: "A perfect eval score that we refuse to brag about",
    body: [
      "The agent passes all 200 fixed eval cases. That sounds impressive and is mostly a property of the design: the planner is deterministic and rule-based, policy is a static attribute of each tool, and ingested text is never planned from.",
      "So the number is reported as what it is: proof that grounding, approval gates and injection handling hold. It is not a measure of reasoning quality. A model-backed planner would need a held-out set and a harder bar.",
    ],
  },
  {
    tag: "Tests",
    title: "The test was wrong, not the code",
    body: [
      "The dedupe test expected 7 duplicate deliveries. The pipeline reported 6. Before touching the code, I checked what the seed generator actually emits: 5 social retries plus 1 HubSpot retry. The assertion had been written from the spec's intent, not from the data.",
      "Lesson: expectations about generated data should come from the generator. The test now asserts 6, and the benchmark artifact (not prose) is the source of every published count.",
    ],
  },
  {
    tag: "Scope",
    title: "What I deliberately did not build",
    body: [
      "No Docker on the build machine meant no live Supabase or Neo4j. Instead of faking it, the deployed demo runs the in-process reference engine, and the migrations, RLS policies and Cypher are shipped as reviewed artifacts labeled “written, not run live”.",
      "No Stripe checkout, MCP server or trigger.dev runtime yet. They're listed as unstarted in BUILD_STATUS.md, because a portfolio that overclaims is worse than one that's honest about its edges.",
    ],
  },
];

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="Build log" title="What broke, what got cut, what I learned.">
        The interesting part of this project isn&apos;t the happy path. It&apos;s the places where a plausible design gave a wrong or misleading answer.
      </PageHeader>
      <div className="mx-auto max-w-3xl space-y-6 px-4 md:px-6">
        {ENTRIES.map((e, i) => (
          <article key={e.title} className="card p-6 md:p-8">
            <p className="font-mono text-[11px] uppercase tracking-wide text-accent">
              #{String(ENTRIES.length - i).padStart(2, "0")} · {e.tag}
            </p>
            <h2 className="font-display mt-2 text-2xl font-semibold leading-snug">{e.title}</h2>
            {e.body.map((p) => (
              <p key={p.slice(0, 20)} className="mt-3 text-[15px] leading-relaxed text-ink-2">
                {p}
              </p>
            ))}
          </article>
        ))}
      </div>
    </>
  );
}
