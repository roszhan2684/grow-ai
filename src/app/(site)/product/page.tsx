import type { Metadata } from "next";
import Link from "next/link";
import { CtaBand, PageHero } from "@/components/site/SiteChrome";

export const metadata: Metadata = { title: "Product", description: "Account intelligence, warm paths, coordinated executive campaigns, a growth agent with approvals, attribution and integrations in one relationship graph." };

const PX = "px-5 md:px-10 xl:px-16";

const FEATURES: { group: string; items: [string, string][] }[] = [
  {
    group: "Understand",
    items: [
      ["Relationship graph", "People, companies, posts, meetings and deals in one living graph that builds itself from your data."],
      ["Account intelligence", "Stakeholders, engagement trends, open opportunities and a timeline of every interaction."],
      ["Signals", "Account warming, executive engagement, new warm paths, topic resonance and champion risk, each with evidence and a recommended action."],
      ["Data quality", "Ambiguous identities wait for a human merge, and invalid records can be repaired and replayed. Nothing is silently dropped."],
    ],
  },
  {
    group: "Act",
    items: [
      ["Warm paths", "Ranked routes from your team to the buyer within three hops, with every score explained."],
      ["Coordinated campaigns", "Distinct angles for your CEO, sales and marketing leaders on one theme, with overlap and claim checks built in."],
      ["Growth agent", "Ask what to do next. The agent researches, recommends and drafts, and waits for approval before anything leaves your workspace."],
      ["Content calendar", "Approved drafts land on a shared calendar across every executive voice."],
    ],
  },
  {
    group: "Measure",
    items: [
      ["Attribution", "Six models side by side, including graph-assisted credit for warm introductions and repeated engagement."],
      ["Pipeline view", "See which open opportunities have relationship touches behind them."],
      ["Health & reliability", "Sync status, dead letters and recovery from rate limits, expired tokens and duplicate deliveries, all visible."],
      ["Audit log", "Every approval, permission change, integration change and repair is recorded."],
    ],
  },
];

export default function Page() {
  return (
    <>
      <PageHero eyebrow="Product" title="The relationship operating system for B2B growth.">
        GROW AI turns every post, introduction, meeting and deal into a graph your whole go-to-market team can act on, and shows its evidence at every step.
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/contact" className="rounded-xl bg-ink px-6 py-3.5 text-[15px] font-semibold text-white hover:bg-[#1e293b]">
            Book a demo
          </Link>
          <Link href="/app" className="rounded-xl border border-line-strong bg-surface px-6 py-3.5 text-[15px] font-semibold text-ink hover:bg-surface-2">
            See it live →
          </Link>
        </div>
      </PageHero>
      {FEATURES.map((g, gi) => (
        <section key={g.group} className={`w-full border-b border-line ${gi % 2 ? "bg-surface" : ""}`}>
          <div className={`grid w-full gap-10 ${PX} py-20 lg:grid-cols-[0.5fr_1.5fr]`}>
            <h2 className="font-display text-[44px] font-bold leading-none text-ink">{g.group}</h2>
            <div className="grid gap-x-10 gap-y-10 sm:grid-cols-2">
              {g.items.map(([t, d]) => (
                <div key={t} className="border-t-2 border-accent pt-5">
                  <h3 className="font-display text-[24px] font-semibold">{t}</h3>
                  <p className="mt-2 text-[15.5px] leading-relaxed text-ink-2">{d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}
      <CtaBand />
    </>
  );
}
