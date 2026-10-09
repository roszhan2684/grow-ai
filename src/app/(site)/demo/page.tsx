import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/site/SiteChrome";

export const metadata: Metadata = { title: "90-second tour", description: "The golden demo route through GROW AI, step by step." };

const STEPS = [
  { t: "0–10s", title: "Overview", href: "/app", say: "GROW AI models the relationships behind B2B pipeline instead of treating content as isolated posts.", do: "Read the headline count of warming accounts. It's computed from the event log, not typed." },
  { t: "10–25s", title: "Acme Robotics", href: "/app/accounts/co_acme-robotics", say: "Five people at Acme engaged on reliability in two weeks. The account is warming.", do: "Point at the stakeholders, the timeline and the topic-resonance signal." },
  { t: "25–40s", title: "Warm path", href: "/app/accounts/co_acme-robotics", say: "Fourteen days ago the CEO's best route to Acme's VP Engineering went through an advisor. Her intro turned it into a direct relationship.", do: "Open Path evolution, then the evidence drawer. The intro event is in there." },
  { t: "40–55s", title: "Ask the agent", href: "/app/agent?company=co_acme-robotics", say: "Every recommendation cites events. The CRM write pauses for approval.", do: "Run “What should we do next?”, then try “Send a message to Tomas”. Approval required." },
  { t: "55–70s", title: "Coordinated campaign", href: "/app/campaigns", say: "One theme, three voices: CEO vision, VP Sales field insight, Marketing framework, with overlap under 0.30.", do: "Type “guaranteed 100% uptime” into a draft and watch approval lock. Revert, then approve." },
  { t: "70–82s", title: "Attribution", href: "/app/attribution", say: "Last touch gives everything to the final like. Graph-assisted puts the most weight on the advisor's intro, with caveats attached.", do: "Toggle the two models on the Acme opportunity." },
  { t: "82–90s", title: "Jobs & Health", href: "/app/jobs", say: "The interesting part was making integrations and the graph replayable under rate limits, duplicates, partial failure and stale identity data.", do: "Inject “Duplicate webhook” and let the assertions land." },
];

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="Demo" title="The 90-second tour.">
        Seven stops, each a real screen running on the deterministic seed. Everything you click persists in your browser. Reset any time from the sidebar.
      </PageHeader>
      <ol className="mx-auto max-w-4xl space-y-3 px-4 md:px-6">
        {STEPS.map((s, i) => (
          <li key={s.title} className="card grid gap-4 p-5 md:grid-cols-[120px_1fr_auto] md:items-center">
            <div>
              <p className="font-mono text-[11px] text-muted">{s.t}</p>
              <p className="font-display text-lg font-semibold">
                {i + 1}. {s.title}
              </p>
            </div>
            <div>
              <p className="text-[14px] text-ink">“{s.say}”</p>
              <p className="mt-1 text-[12.5px] text-muted">{s.do}</p>
            </div>
            <Link href={s.href} className="rounded-lg border border-line-strong px-3 py-1.5 text-center text-[13px] font-medium hover:bg-surface-2">
              Open →
            </Link>
          </li>
        ))}
      </ol>
      <div className="mx-auto mt-10 max-w-4xl px-4 text-center md:px-6">
        <Link href="/app" className="inline-block rounded-xl bg-ink px-6 py-3 text-[14px] font-medium text-white hover:bg-[#1e293b]">
          Start at the Overview →
        </Link>
      </div>
    </>
  );
}
