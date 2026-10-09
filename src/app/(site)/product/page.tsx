import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/site/SiteChrome";

export const metadata: Metadata = { title: "Product", description: "Every surface of GROW AI: account intelligence, graph explorer, warm paths, coordinated campaigns, agent traces, attribution, integrations and reliability." };

const SURFACES = [
  { title: "Overview", href: "/app", who: "Founder / CEO", body: "Accounts warming in the last 14 days, pipeline with tracked touches, warm-path coverage, sync health, an activation checklist derived from real state, and the next actions worth doing today." },
  { title: "Account intelligence", href: "/app/accounts/co_acme-robotics", who: "VP Sales", body: "Stakeholders, a relationship-graph slice, ranked warm paths with every score component visible, path evolution over the last 14 days, an engagement timeline and the signals behind it." },
  { title: "Graph explorer", href: "/app/graph", who: "GTM operator", body: "Filter by relationship type, replay 30/60/90 days with a time scrubber, pick a team member and an account to light up the warmest path, and click any edge for the events that created it." },
  { title: "Data quality", href: "/app/graph/data-quality", who: "GTM operator", body: "Ambiguous identities wait for a human merge, dead-lettered payloads can be repaired and replayed, and every duplicate delivery is visible instead of silently dropped." },
  { title: "Coordinated campaigns", href: "/app/campaigns", who: "Head of Marketing", body: "One theme becomes three angle briefs (CEO vision, VP Sales field insight, Marketing framework) before any post is written. Drafts are checked for overlap, forbidden claims, unsupported numbers and voice, live as you edit." },
  { title: "Signals", href: "/app/signals", who: "Everyone", body: "Account warming, executive engagement, warm path emerged, topic resonance, champion risk and integration degradation. Each card says what changed, why it matters, its evidence, confidence, owner and next action." },
  { title: "Agent", href: "/app/agent", who: "Everyone", body: "Ask “what should we do next?” and get a grounded answer with a full tool trace. CRM writes, scheduling and outbound messages pause for approval and execute exactly once." },
  { title: "Attribution", href: "/app/attribution", who: "Head of Marketing", body: "First touch, last touch, linear, time decay, position based and graph assisted, compared side by side over the same touches. Excluded touches come with reasons. The caveat is never hidden." },
  { title: "Integrations", href: "/app/integrations", who: "Engineer / admin", body: "Connector cards with mode (live, mock or fixture), cursor, counts and last error. Plus a working CSV import, an OAuth + PKCE authorization builder and a signed-webhook tester that hits the real endpoint." },
  { title: "Jobs & Health", href: "/app/jobs", who: "Engineer / admin", body: "SLO cards, recent jobs, the raw event log, and the Break-it panel: eight failure classes injected into the real pipeline with assertions you can read." },
  { title: "Developer", href: "/app/developer", who: "Engineer", body: "Schema migrations, projection version and checksums, connector status, feature flags and copy-paste API calls." },
  { title: "Settings", href: "/app/settings", who: "Owner", body: "Roles, seats and an upgrade path that changes the seat allowance, executive personas, and an audit log of every permission, approval, repair and replay." },
];

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="Product" title="From “who should we talk to?” to “here’s the evidence.”">
        Twelve surfaces, one event log. Every screen below is live in the demo and computed from the same synthetic seed: 12 target accounts, 45 people, 30 posts and 120 engagements over 90 days.
      </PageHeader>
      <div className="mx-auto grid max-w-6xl gap-4 px-4 md:grid-cols-2 md:px-6 lg:grid-cols-3">
        {SURFACES.map((s) => (
          <Link key={s.title} href={s.href} className="card group flex flex-col p-6 transition-colors hover:border-line-strong">
            <p className="font-mono text-[10.5px] uppercase tracking-wide text-muted">{s.who}</p>
            <h2 className="font-display mt-2 text-xl font-semibold">{s.title}</h2>
            <p className="mt-2 flex-1 text-[13.5px] leading-relaxed text-ink-2">{s.body}</p>
            <span className="mt-4 text-[13px] font-medium text-accent group-hover:underline">Open in demo →</span>
          </Link>
        ))}
      </div>
    </>
  );
}
