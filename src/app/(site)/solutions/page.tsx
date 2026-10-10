import type { Metadata } from "next";
import Link from "next/link";
import { CtaBand, PageHero } from "@/components/site/SiteChrome";

export const metadata: Metadata = { title: "Solutions", description: "GROW AI for founders and CEOs, sales, marketing and RevOps teams." };

const PX = "px-5 md:px-10 xl:px-16";

const ROLES = [
  { id: "founders", who: "Founders & CEOs", title: "Build authority and know which relationships are warming.", points: ["See which target accounts engage with your point of view", "Get a clear vision angle for every campaign theme", "Know when an executive at a target account engages twice"], open: ["Overview", "/app"] },
  { id: "sales", who: "Sales", title: "Turn engagement into conversations through the warmest path.", points: ["Ranked warm paths into every account, with the evidence behind each hop", "Champion-risk alerts when an engaged contact changes company", "Agent-drafted CRM notes that you approve with one click"], open: ["Account intelligence", "/app/accounts/co_acme-robotics"] },
  { id: "marketing", who: "Marketing", title: "Coordinate executive narratives and prove pipeline impact.", points: ["One theme, three distinct executive voices, with no duplicated posts", "Forbidden-claim and unsupported-number checks before approval", "Attribution that credits introductions and repeated engagement"], open: ["Campaigns", "/app/campaigns"] },
  { id: "revops", who: "RevOps", title: "Keep the data trustworthy and every action accountable.", points: ["Identity resolution with a human review queue for ambiguous matches", "Connector health, dead-letter repair and replay", "Roles, seats and a complete audit log"], open: ["Jobs & Health", "/app/jobs"] },
];

export default function Page() {
  return (
    <>
      <PageHero eyebrow="Solutions" title="Built for every team that grows through trust." />
      {ROLES.map((r, i) => (
        <section key={r.id} id={r.id} className={`w-full scroll-mt-20 border-b border-line ${i % 2 ? "bg-surface" : ""}`}>
          <div className={`grid w-full items-start gap-10 ${PX} py-20 lg:grid-cols-2`}>
            <div>
              <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-accent">{r.who}</p>
              <h2 className="font-display mt-4 text-[36px] font-bold leading-tight md:text-[44px]">{r.title}</h2>
              <Link href={r.open[1]!} className="mt-6 inline-block text-[15px] font-medium text-accent hover:underline">
                Explore {r.open[0]} →
              </Link>
            </div>
            <ul className="space-y-4">
              {r.points.map((p) => (
                <li key={p} className="flex gap-4 rounded-2xl border border-line bg-canvas p-5 text-[16px] leading-relaxed text-ink">
                  <span className="mt-1 flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] text-white" aria-hidden>
                    ✓
                  </span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ))}
      <CtaBand />
    </>
  );
}
