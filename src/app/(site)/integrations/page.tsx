import type { Metadata } from "next";
import { CtaBand, PageHero } from "@/components/site/SiteChrome";

export const metadata: Metadata = { title: "Integrations", description: "Connect your CRM, HubSpot, Slack and engagement data to GROW AI." };

const PX = "px-5 md:px-10 xl:px-16";

const INTEGRATIONS = [
  { name: "CRM import (CSV)", status: "Available", body: "Upload contacts and accounts from any CRM. Rows are validated, errors are reported line by line, and re-imports never create duplicates." },
  { name: "HubSpot", status: "Beta", body: "Deals, meetings and contact ownership flow into the graph through OAuth and signed webhooks." },
  { name: "Slack", status: "Beta", body: "Warm introductions shared in your channels become relationship edges with evidence." },
  { name: "Social engagement", status: "Beta", body: "Engagement with your executives' posts (likes, comments and replies) becomes account signals." },
  { name: "Stripe", status: "Planned", body: "Seat-based billing and plan upgrades." },
  { name: "MCP", status: "Planned", body: "Expose warm paths and account intelligence to your own AI tools." },
];

export default function Page() {
  return (
    <>
      <PageHero eyebrow="Integrations" title="Connect the tools where relationships already live.">
        Every source writes into one event history first, so syncs are de-duplicated, retry safely, and recover visibly when something goes wrong.
      </PageHero>
      <section className="w-full">
        <div className={`grid w-full gap-px bg-line sm:grid-cols-2 xl:grid-cols-3`}>
          {INTEGRATIONS.map((i) => (
            <div key={i.name} className={`bg-canvas ${PX} py-12`}>
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-[26px] font-semibold">{i.name}</h2>
                <span className={`rounded-full px-3 py-1 text-[12px] font-medium ${i.status === "Available" ? "bg-accent text-white" : i.status === "Beta" ? "bg-accent-soft text-accent-ink" : "bg-surface-2 text-ink-2"}`}>{i.status}</span>
              </div>
              <p className="mt-3 max-w-md text-[15.5px] leading-relaxed text-ink-2">{i.body}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="w-full border-y border-line bg-surface">
        <div className={`grid w-full gap-10 ${PX} py-20 lg:grid-cols-4`}>
          {[
            ["No duplicates", "Repeated deliveries are recognized and recorded, never counted twice."],
            ["Safe retries", "Rate limits and outages back off and retry automatically."],
            ["Reconnect prompts", "Expired or revoked access is flagged so nothing syncs silently stale."],
            ["Repair & replay", "Invalid records are held with a clear reason, ready to fix and replay."],
          ].map(([t, d]) => (
            <div key={t}>
              <p className="font-display text-[22px] font-semibold">{t}</p>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{d}</p>
            </div>
          ))}
        </div>
      </section>
      <CtaBand title="Bring your own data into GROW AI." body="Start with a CSV export from your CRM and add sources as you go." />
    </>
  );
}
