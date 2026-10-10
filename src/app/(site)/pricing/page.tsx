import type { Metadata } from "next";
import Link from "next/link";
import { CtaBand, PageHero } from "@/components/site/SiteChrome";
import { PLANS, type PlanId } from "@/core/billing/plans";

export const metadata: Metadata = { title: "Pricing", description: "GROW AI plans for teams of every size." };

const PX = "px-5 md:px-10 xl:px-16";

const DETAIL: Record<PlanId, { pitch: string; features: string[] }> = {
  starter: { pitch: "For founding teams putting relationships at the center of growth.", features: ["3 seats", "Relationship graph & warm paths", "Account intelligence & signals", "CSV CRM import", "Growth agent with approvals"] },
  growth: { pitch: "For go-to-market teams coordinating executives, sales and marketing.", features: ["10 seats", "Everything in Starter", "Coordinated executive campaigns", "All six attribution models", "HubSpot & Slack (beta)"] },
  scale: { pitch: "For larger teams that need control, scale and support.", features: ["25 seats", "Everything in Growth", "Advanced roles & audit log", "Priority sync & replay", "Dedicated onboarding"] },
};

export default function Page() {
  return (
    <>
      <PageHero eyebrow="Pricing" title="Plans that grow with your team.">
        Every plan includes the relationship graph, warm paths and a growth agent that asks before it acts. Talk to us for pricing that fits your team.
      </PageHero>
      <section className="w-full">
        <div className="grid w-full gap-px bg-line lg:grid-cols-3">
          {(Object.keys(PLANS) as PlanId[]).map((id) => (
            <div key={id} className={`flex flex-col ${id === "growth" ? "bg-ink text-white" : "bg-canvas"} ${PX} py-14`}>
              <div className="flex items-center justify-between">
                <h2 className="font-display text-[36px] font-bold">{PLANS[id].name}</h2>
                {id === "growth" && <span className="rounded-full bg-[#5eead4] px-3 py-1 text-[12px] font-semibold text-ink">Most popular</span>}
              </div>
              <p className={`mt-3 max-w-sm text-[15.5px] leading-relaxed ${id === "growth" ? "text-white/70" : "text-ink-2"}`}>{DETAIL[id].pitch}</p>
              <ul className="mt-8 flex-1 space-y-3">
                {DETAIL[id].features.map((f) => (
                  <li key={f} className="flex gap-3 text-[15.5px]">
                    <span className={id === "growth" ? "text-[#5eead4]" : "text-accent"} aria-hidden>
                      ✓
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href={`/contact?plan=${id}`} className={`mt-10 rounded-xl px-6 py-3.5 text-center text-[15px] font-semibold ${id === "growth" ? "bg-white text-ink hover:bg-white/90" : "bg-ink text-white hover:bg-[#1e293b]"}`}>
                Talk to sales
              </Link>
            </div>
          ))}
        </div>
      </section>
      <CtaBand title="Not sure which plan fits?" body="Tell us about your team and we'll recommend a setup on a live walkthrough." />
    </>
  );
}
