"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useDemo } from "@/lib/demo-store";
import { Badge, Button, cx } from "./ui";
import { Logo } from "./Logo";

const NAV: { label: string; href: string; children?: { label: string; href: string }[] }[] = [
  { label: "Overview", href: "/app" },
  { label: "Accounts", href: "/app/accounts" },
  { label: "Graph", href: "/app/graph", children: [{ label: "Explorer", href: "/app/graph" }, { label: "Data quality", href: "/app/graph/data-quality" }] },
  { label: "Campaigns", href: "/app/campaigns" },
  { label: "Signals", href: "/app/signals" },
  { label: "Agent", href: "/app/agent" },
  { label: "Attribution", href: "/app/attribution" },
  { label: "Integrations", href: "/app/integrations" },
  { label: "Jobs & Health", href: "/app/jobs" },
  { label: "Developer", href: "/app/developer" },
  { label: "Settings", href: "/app/settings" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { ws, state, actions } = useDemo();
  const [open, setOpen] = useState(false);
  const active = (href: string) => (href === "/app" ? path === "/app" : path.startsWith(href));
  const openSignals = ws.signals.filter((s) => (state.signalStatus[s.id] ?? s.status) === "open").length;

  const nav = (
    <nav className="flex flex-col gap-0.5" aria-label="App">
      {NAV.map((n) => (
        <div key={n.href}>
          <Link href={n.href} onClick={() => setOpen(false)} className={cx("flex items-center justify-between rounded-lg px-2.5 py-1.5 text-[13px] transition-colors", active(n.href) ? "bg-surface font-medium text-ink shadow-[0_0_0_1px_var(--line)]" : "text-ink-2 hover:bg-surface-2")}>
            {n.label}
            {n.label === "Signals" && openSignals > 0 && <span className="tnum rounded bg-accent-soft px-1.5 text-[11px] font-medium text-accent-ink">{openSignals}</span>}
          </Link>
          {n.children && active(n.href) && (
            <div className="ml-3 mt-0.5 flex flex-col border-l border-line pl-2">
              {n.children.map((c) => (
                <Link key={c.href} href={c.href} onClick={() => setOpen(false)} className={cx("rounded-md px-2 py-1 text-[12.5px]", path === c.href ? "font-medium text-ink" : "text-muted hover:text-ink")}>
                  {c.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-line bg-canvas px-3 py-4 lg:flex">
        <Link href="/" className="mb-5 px-2">
          <Logo />
        </Link>
        <div className="mb-4 rounded-lg border border-line bg-surface px-2.5 py-2">
          <p className="text-[12.5px] font-semibold text-ink">Northstar Cloud</p>
          <p className="text-[11px] text-muted">Demo org · fictional</p>
        </div>
        {nav}
        <div className="mt-auto space-y-2 px-1 pt-4">
          <p className="text-[11px] leading-snug text-muted">Your changes live in this browser and replay through the same engine.</p>
          <Button size="sm" variant="secondary" onClick={actions.reset} className="w-full">
            Reset demo
          </Button>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex h-12 items-center justify-between gap-3 border-b border-line bg-canvas/85 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-2">
            <button className="rounded-md border border-line px-2 py-1 text-xs lg:hidden" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="mobile-nav">
              Menu
            </button>
            <span className="hidden font-mono text-[11px] text-muted sm:inline">as of Oct 1, 2026 · {ws.ingest.raw.length} raw events</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone="warning">Synthetic demo data</Badge>
            <Link href="/" className="text-xs text-muted hover:text-ink">
              Site ↗
            </Link>
          </div>
        </header>
        {open && (
          <div id="mobile-nav" className="border-b border-line bg-canvas px-4 py-3 lg:hidden">
            {nav}
          </div>
        )}
        {state.graphOutageAt !== null && (
          <div role="status" className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f3d9b1] bg-[#fdf3e3] px-4 py-2 text-[13px] text-warning md:px-8">
            <span>
              <strong>Graph store unavailable (injected).</strong> Serving the last good projection · lag {ws.projectionLag} event{ws.projectionLag === 1 ? "" : "s"}. Postgres still has every event.
            </span>
            <Button size="sm" onClick={actions.restoreGraph}>
              Restore &amp; replay
            </Button>
          </div>
        )}
        <main className="mx-auto max-w-[1280px] px-4 py-8 md:px-8">{children}</main>
      </div>
    </div>
  );
}
