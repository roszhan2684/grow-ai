import Link from "next/link";
import { Logo } from "@/components/Logo";

const LINKS = [
  ["Product", "/product"],
  ["Solutions", "/solutions"],
  ["Integrations", "/integrations"],
  ["Security", "/security"],
  ["Pricing", "/pricing"],
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-line/70 bg-canvas/85 backdrop-blur">
      <div className="flex h-16 w-full items-center justify-between gap-4 px-5 md:px-10 xl:px-16">
        <Link href="/" aria-label="GROW AI home">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-7 text-[14px] text-ink-2 lg:flex" aria-label="Site">
          {LINKS.map(([l, h]) => (
            <Link key={h} href={h} className="hover:text-ink">
              {l}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/app" className="hidden rounded-lg px-3 py-2 text-[14px] text-ink-2 hover:text-ink sm:block">
            Sign in
          </Link>
          <Link href="/contact" className="rounded-lg bg-ink px-4 py-2 text-[14px] font-medium text-white hover:bg-[#1e293b]">
            Book a demo
          </Link>
        </div>
      </div>
      <nav className="flex w-full gap-5 overflow-x-auto border-t border-line/70 px-5 py-2.5 text-[13px] text-ink-2 lg:hidden" aria-label="Site (mobile)">
        {LINKS.map(([l, h]) => (
          <Link key={h} href={h} className="shrink-0">
            {l}
          </Link>
        ))}
      </nav>
    </header>
  );
}

export function SiteFooter() {
  const col = (title: string, links: [string, string][]) => (
    <div className="space-y-2">
      <p className="font-medium text-white">{title}</p>
      {links.map(([l, h]) => (
        <Link key={h + l} href={h} className="block text-white/60 hover:text-white">
          {l}
        </Link>
      ))}
    </div>
  );
  return (
    <footer className="w-full bg-ink text-[14px] text-white">
      <div className="grid w-full gap-10 px-5 py-16 md:grid-cols-[1.6fr_1fr_1fr_1fr] md:px-10 xl:px-16">
        <div>
          <span className="inline-flex items-center gap-2">
            <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden>
              <rect width="32" height="32" rx="8" fill="#ffffff" />
              <line x1="9" y1="22" x2="16" y2="11" stroke="#0f766e" strokeWidth="2" strokeLinecap="round" />
              <line x1="16" y1="11" x2="23" y2="17" stroke="#0f766e" strokeWidth="2" strokeLinecap="round" />
              <circle cx="9" cy="22" r="3" fill="#0f172a" />
              <circle cx="16" cy="11" r="3" fill="#0f766e" />
              <circle cx="23" cy="17" r="3" fill="#0f172a" />
            </svg>
            <span className="font-display text-[18px] font-bold">GROW AI</span>
          </span>
          <p className="mt-4 max-w-sm text-white/60">Relationship intelligence for B2B teams. Know who&apos;s warming up, find the warmest way in, and prove what actually moved the deal.</p>
        </div>
        {col("Product", [["Overview", "/product"], ["Integrations", "/integrations"], ["Security", "/security"], ["Pricing", "/pricing"]])}
        {col("Solutions", [["Founders & CEOs", "/solutions#founders"], ["Sales", "/solutions#sales"], ["Marketing", "/solutions#marketing"], ["RevOps", "/solutions#revops"]])}
        {col("Company", [["Book a demo", "/contact"], ["Sign in", "/app"]])}
      </div>
      <div className="w-full border-t border-white/10 px-5 py-5 text-[12.5px] text-white/45 md:px-10 xl:px-16">© {2026} GROW AI. All rights reserved.</div>
    </footer>
  );
}

/** Full-bleed page header used by inner marketing pages. */
export function PageHero({ eyebrow, title, children, tone = "light" }: { eyebrow: string; title: React.ReactNode; children?: React.ReactNode; tone?: "light" | "tint" }) {
  return (
    <section className={`relative w-full overflow-hidden border-b border-line ${tone === "tint" ? "bg-accent-soft/50" : ""}`}>
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-60" aria-hidden />
      <div className="relative w-full px-5 pt-20 pb-16 md:px-10 md:pt-28 md:pb-20 xl:px-16">
        <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-accent">{eyebrow}</p>
        <h1 className="font-display mt-4 max-w-5xl text-[44px] font-bold leading-[1.02] text-ink md:text-[68px]">{title}</h1>
        {children && <div className="mt-6 max-w-3xl text-[18px] leading-relaxed text-ink-2">{children}</div>}
      </div>
    </section>
  );
}

export function CtaBand({ title = "See your relationships as a system.", body = "Walk through GROW AI with your team and see warm paths, coordinated campaigns and attribution on a live workspace." }: { title?: string; body?: string }) {
  return (
    <section className="relative w-full overflow-hidden bg-accent">
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-15" aria-hidden />
      <div className="relative flex w-full flex-col items-start justify-between gap-8 px-5 py-20 md:flex-row md:items-center md:px-10 xl:px-16">
        <div>
          <h2 className="font-display max-w-3xl text-[38px] font-bold leading-tight text-white md:text-[52px]">{title}</h2>
          <p className="mt-4 max-w-2xl text-[17px] text-white/80">{body}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-3">
          <Link href="/contact" className="rounded-xl bg-white px-6 py-3.5 text-[15px] font-semibold text-ink hover:bg-white/90">
            Book a demo
          </Link>
          <Link href="/app" className="rounded-xl border border-white/30 px-6 py-3.5 text-[15px] font-semibold text-white hover:bg-white/10">
            See it live
          </Link>
        </div>
      </div>
    </section>
  );
}
