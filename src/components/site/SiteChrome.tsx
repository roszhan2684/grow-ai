import Link from "next/link";
import { Logo } from "@/components/Logo";
import { GITHUB_URL } from "@/lib/site";

const LINKS = [
  ["Product", "/product"],
  ["Architecture", "/architecture"],
  ["Benchmarks", "/benchmarks"],
  ["Build log", "/build-log"],
  ["Security", "/security"],
  ["Changelog", "/changelog"],
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-canvas/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 md:px-6">
        <Link href="/" aria-label="GROW AI home">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-5 text-[13px] text-ink-2 md:flex" aria-label="Site">
          {LINKS.map(([l, h]) => (
            <Link key={h} href={h} className="hover:text-ink">
              {l}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <a href={GITHUB_URL} className="hidden rounded-lg px-2.5 py-1.5 text-[13px] text-ink-2 hover:text-ink sm:block">
            GitHub
          </a>
          <Link href="/app" className="rounded-lg bg-ink px-3 py-1.5 text-[13px] font-medium text-white hover:bg-[#1e293b]">
            Live demo
          </Link>
        </div>
      </div>
      <nav className="flex gap-4 overflow-x-auto border-t border-line/70 px-4 py-2 text-[12.5px] text-ink-2 md:hidden" aria-label="Site (mobile)">
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
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-[13px] md:grid-cols-[1.4fr_1fr_1fr] md:px-6">
        <div>
          <Logo />
          <p className="mt-3 max-w-sm text-muted">An independent portfolio project. Every company, person, post and dollar figure in the demo is synthetic. Every engineering number on this site is loaded from a checked-in benchmark artifact.</p>
        </div>
        <div className="space-y-1.5">
          <p className="font-medium">Explore</p>
          <Link href="/app" className="block text-muted hover:text-ink">Live demo</Link>
          <Link href="/demo" className="block text-muted hover:text-ink">90-second tour</Link>
          <Link href="/product" className="block text-muted hover:text-ink">Product</Link>
          <Link href="/architecture" className="block text-muted hover:text-ink">Architecture</Link>
        </div>
        <div className="space-y-1.5">
          <p className="font-medium">Proof</p>
          <Link href="/benchmarks" className="block text-muted hover:text-ink">Benchmarks</Link>
          <Link href="/build-log" className="block text-muted hover:text-ink">Build log</Link>
          <Link href="/security" className="block text-muted hover:text-ink">Security</Link>
          <a href={GITHUB_URL} className="block text-muted hover:text-ink">Source on GitHub</a>
        </div>
      </div>
    </footer>
  );
}

export function PageHeader({ eyebrow, title, children }: { eyebrow: string; title: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-16 pb-10 md:px-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent">{eyebrow}</p>
      <h1 className="font-display mt-3 max-w-3xl text-4xl font-semibold leading-[1.05] text-ink md:text-5xl">{title}</h1>
      {children && <div className="mt-5 max-w-2xl text-[16px] leading-relaxed text-ink-2">{children}</div>}
    </div>
  );
}
