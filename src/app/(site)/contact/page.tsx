import type { Metadata } from "next";
import { Suspense } from "react";
import { ContactForm } from "@/components/site/ContactForm";

export const metadata: Metadata = { title: "Book a demo", description: "See GROW AI on a live workspace with your team." };

export default function Page() {
  return (
    <section className="relative w-full overflow-hidden">
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-60" aria-hidden />
      <div className="relative grid w-full gap-14 px-5 py-20 md:px-10 md:py-28 lg:grid-cols-2 xl:px-16">
        <div>
          <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-accent">Book a demo</p>
          <h1 className="font-display mt-4 text-[48px] font-bold leading-[1.02] md:text-[64px]">See your relationships as a system.</h1>
          <p className="mt-6 max-w-xl text-[18px] leading-relaxed text-ink-2">In 30 minutes we&apos;ll walk through warm paths, coordinated campaigns, the growth agent and attribution on a live workspace, and map them to your team.</p>
          <ul className="mt-10 space-y-4 text-[16px]">
            {["A tour tailored to your go-to-market motion", "How your CRM and Slack data become a relationship graph", "Which plan fits your team"].map((t) => (
              <li key={t} className="flex gap-3">
                <span className="mt-1 flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-[11px] text-white" aria-hidden>
                  ✓
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>
        <div className="card p-6 md:p-10">
          <Suspense fallback={null}>
            <ContactForm />
          </Suspense>
        </div>
      </div>
    </section>
  );
}
