"use client";

import Link from "next/link";
import { activationSteps, useDemo } from "@/lib/demo-store";
import { Badge, Card, Meter, SectionTitle, Sparkline, Stat, StatusBadge, money } from "@/components/ui";
import { personName } from "@/core/workspace";
import { formatDate, formatRelative } from "@/core/lib/time";
import { SIGNAL_LABELS } from "@/core/signals/detect";
import { PERSONA_STRATEGY } from "@/core/content/engine";

export function OverviewView() {
  const { ws, state } = useDemo();
  const warming = ws.accounts.filter((a) => a.signals.some((s) => s.type === "account_warming"));
  const steps = activationSteps(ws, state);
  const done = steps.filter((s) => s.done).length;
  const openOpps = ws.opportunities.filter((o) => !o.stage.startsWith("closed"));
  const influenced = openOpps.filter((o) => ws.attributionFor(o, "linear").touches.length > 0);
  const strongPaths = [...ws.warmPaths.values()].filter((p) => (p[0]?.score ?? 0) >= 0.6).length;
  const healthy = ws.integrations.filter((i) => i.status === "HEALTHY" && i.deadLetters === 0).length;
  const recs = ws.signals.filter((s) => (state.signalStatus[s.id] ?? s.status) === "open" && s.type !== "integration_degradation").slice(0, 5);
  const drafts = ws.campaigns.flatMap((c) => ws.campaignDrafts.get(c.id)!.drafts.map((d) => ({ ...d, theme: c.theme })));

  return (
    <div>
      <SectionTitle eyebrow="Overview" title={<>{warming.length} accounts warming in the last 14 days</>}>
        <Link href="/app/agent" className="rounded-lg bg-ink px-3.5 py-2 text-[13px] font-medium text-white hover:bg-[#1e293b]">
          Ask “What should we do next?”
        </Link>
      </SectionTitle>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Accounts warming (14d)" value={warming.length} sub={`of ${ws.targets.length} target accounts`} href="/app/accounts" />
        <Stat label="Open pipeline with tracked touches" value={money(influenced.reduce((s, o) => s + o.amount, 0))} sub={`${influenced.length} open opportunities · synthetic $`} href="/app/attribution" />
        <Stat label="Accounts with a warm path ≥ 0.60" value={strongPaths} sub="≤ 3 hops, evidence-backed" href="/app/graph" />
        <Stat label="Sources fully healthy" value={`${healthy}/${ws.integrations.length}`} sub={ws.integrations.some((i) => i.deadLetters) ? `${ws.integrations.reduce((s, i) => s + i.deadLetters, 0)} event in dead letter` : "no dead letters"} href="/app/integrations" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card title="Warming accounts" subtitle="Ranked by warmth index: 50% recent interactions, 30% best path score, 20% people engaged" action={<Link href="/app/accounts" className="text-xs text-accent hover:underline">All accounts →</Link>}>
            <ul className="divide-y divide-line">
              {ws.accounts.slice(0, 6).map((a) => (
                <li key={a.company.id}>
                  <Link href={`/app/accounts/${a.company.id}`} className="grid grid-cols-[1fr_auto] items-center gap-4 px-5 py-3 hover:bg-surface-2 md:grid-cols-[minmax(0,1.3fr)_110px_minmax(0,1.6fr)_60px]">
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-medium text-ink">{a.company.name}</p>
                      <p className="truncate text-xs text-muted">
                        {a.engagement14d} touches · {a.engagedPeople30d} people · {a.opportunity ? a.opportunity.stage.replace("_", " ") : "no opportunity"}
                      </p>
                    </div>
                    <div className="hidden md:block">
                      <Sparkline values={a.weekly} />
                    </div>
                    <p className="hidden truncate text-xs text-ink-2 md:block">{a.bestPath ? a.bestPath.nodeIds.map((id) => personName(ws, id)).join(" → ") : <span className="text-muted">No path within 3 hops</span>}</p>
                    <div className="text-right">
                      <p className="tnum font-display text-lg font-semibold">{a.warmth}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Recommended next actions" subtitle="Each one is derived from stored events and links to its evidence" action={<Link href="/app/signals" className="text-xs text-accent hover:underline">All signals →</Link>}>
            <ul className="divide-y divide-line">
              {recs.map((s) => (
                <li key={s.id} className="px-5 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={s.type === "champion_risk" ? "danger" : "accent"}>{SIGNAL_LABELS[s.type]}</Badge>
                    <span className="text-[13px] font-medium text-ink">{s.title}</span>
                  </div>
                  <p className="mt-1 text-[13px] text-ink-2">→ {s.recommendedAction}</p>
                  <p className="mt-0.5 text-[11px] text-muted">
                    {s.evidence.length} evidence events · confidence {s.confidence.toFixed(2)} · owner {s.owner}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Activation" subtitle={`${done} of ${steps.length} complete`}>
            <div className="px-5 pt-3">
              <Meter value={done} max={steps.length} label="Activation progress" />
            </div>
            <ol className="space-y-2.5 px-5 py-4">
              {steps.map((s) => (
                <li key={s.id} className="flex gap-2.5">
                  <span aria-hidden className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full text-[10px] ${s.done ? "bg-accent text-white" : "border border-line-strong text-transparent"}`}>
                    ✓
                  </span>
                  <div>
                    <p className={`text-[13px] ${s.done ? "text-ink" : "font-medium text-ink"}`}>
                      {s.label} <span className="sr-only">{s.done ? "(done)" : "(to do)"}</span>
                    </p>
                    <p className="text-[11px] text-muted">{s.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>

          <Card title="Content calendar" subtitle="Next 7 days" action={<Link href="/app/campaigns" className="text-xs text-accent hover:underline">Plan →</Link>}>
            <ul className="divide-y divide-line">
              {drafts.slice(0, 6).map((d) => (
                <li key={d.id} className="flex items-start gap-3 px-5 py-2.5">
                  <span className="tnum w-12 shrink-0 font-mono text-[11px] text-muted">{formatDate(d.scheduledFor)}</span>
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] text-ink">{d.title}</p>
                    <p className="text-[11px] text-muted">
                      {PERSONA_STRATEGY[d.persona].label} · {state.draftStatus[d.id] ?? "pending approval"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Sync health" action={<Link href="/app/jobs" className="text-xs text-accent hover:underline">Jobs →</Link>}>
            <ul className="divide-y divide-line">
              {ws.integrations.map((i) => (
                <li key={i.provider} className="flex items-center justify-between gap-2 px-5 py-2.5">
                  <div>
                    <p className="text-[13px] text-ink">{i.displayName}</p>
                    <p className="text-[11px] text-muted">
                      {i.normalized} normalized · {i.duplicates} dupes · last {i.lastSyncAt ? formatRelative(i.lastSyncAt) : "never"}
                    </p>
                  </div>
                  <StatusBadge status={i.deadLetters ? "DEGRADED" : i.status} />
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
