"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useDemo } from "@/lib/demo-store";
import { Badge, Card, Empty, Meter, SectionTitle, money } from "@/components/ui";
import { GraphCanvas, GraphLegend } from "@/components/GraphCanvas";
import { EvidenceList } from "@/components/Evidence";
import { buildGraphView } from "@/lib/graph-view";
import { accountTimeline, personName } from "@/core/workspace";
import { projectGraph } from "@/core/graph/project";
import { findWarmPaths, WARM_PATH_WEIGHTS } from "@/core/graph/warmPaths";
import { DAY_MS, formatRelative } from "@/core/lib/time";
import { SIGNAL_LABELS } from "@/core/signals/detect";

const COMPONENT_LABELS: Record<keyof typeof WARM_PATH_WEIGHTS, string> = {
  relationship_strength: "Relationship strength (weakest link)",
  recency_score: "Recency",
  source_diversity: "Source diversity",
  role_relevance: "Role relevance",
  engagement_momentum: "Engagement momentum",
};

export function AccountView({ id }: { id: string }) {
  const { ws } = useDemo();
  const acct = ws.accounts.find((a) => a.company.id === id);
  const paths = ws.warmPaths.get(id) ?? [];
  const [selected, setSelected] = useState(0);
  const view = useMemo(() => buildGraphView(ws, { companyId: id }), [ws, id]);
  const timeline = useMemo(() => accountTimeline(ws, id), [ws, id]);

  // Path evolution: the same search against the graph as it stood 14 days ago.
  const before = useMemo(() => {
    const now = ws.now - 14 * DAY_MS;
    const cut = new Date(now).toISOString();
    const events = ws.resolved.filter((e) => e.occurredAt <= cut);
    return findWarmPaths(projectGraph(events, ws.directory), ws.directory, events, id, { now, limit: 3 });
  }, [ws, id]);

  if (!acct) return <Empty title="Account not found" />;
  const path = paths[selected];
  const name = (pid: string) => personName(ws, pid);

  return (
    <div>
      <SectionTitle eyebrow={`Account intelligence · ${acct.company.industry} · ${acct.company.sizeBand}`} title={acct.company.name}>
        <div className="flex flex-wrap items-center gap-2">
          {acct.opportunity && (
            <Badge tone={acct.opportunity.stage === "closed_won" ? "positive" : "accent"}>
              {acct.opportunity.name} · {acct.opportunity.stage.replace("_", " ")} · {money(acct.opportunity.amount)}
            </Badge>
          )}
          <Link href={`/app/agent?company=${id}`} className="rounded-lg bg-ink px-3 py-1.5 text-[13px] font-medium text-white hover:bg-[#1e293b]">
            Ask the agent →
          </Link>
        </div>
      </SectionTitle>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Warmth index", acct.warmth],
          ["Interactions (14d)", acct.engagement14d],
          ["People engaged (30d)", acct.engagedPeople30d],
          ["Best path score", acct.bestPath ? acct.bestPath.score.toFixed(2) : "—"],
        ].map(([l, v]) => (
          <div key={l} className="card px-4 py-3">
            <p className="text-xs text-muted">{l}</p>
            <p className="tnum mt-1 font-display text-2xl font-semibold">{v}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-6">
          <Card title="Relationship graph" subtitle="Everyone at the account, our team, and every node on a warm path" action={<GraphLegend />}>
            <div className="p-2">
              <GraphCanvas nodes={view.nodes} edges={view.edges} height={460} highlight={path?.nodeIds} labels="all" ariaLabel={`Relationship graph for ${acct.company.name}`} />
            </div>
          </Card>

          <Card title="Warm paths" subtitle="Team member → ≤3 relationship hops → stakeholder. Score = weighted sum of the components below.">
            {paths.length === 0 ? (
              <Empty title="No warm path within 3 hops">Engagement exists but nobody on the team has a relationship chain into this account yet.</Empty>
            ) : (
              <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <ul className="border-b border-line md:border-r md:border-b-0">
                  {paths.slice(0, 6).map((p, i) => (
                    <li key={p.id}>
                      <button onClick={() => setSelected(i)} className={`w-full px-5 py-3 text-left ${i === selected ? "bg-accent-soft" : "hover:bg-surface-2"}`} aria-pressed={i === selected}>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[13px] font-medium text-ink">{p.nodeIds.map(name).join(" → ")}</p>
                          <span className="tnum font-mono text-xs">{p.score.toFixed(2)}</span>
                        </div>
                        <p className="text-[11px] text-muted">
                          {p.hops.length} hop{p.hops.length > 1 ? "s" : ""} · {p.evidence.length} evidence events
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
                {path && (
                  <div className="space-y-3 px-5 py-4">
                    {(Object.keys(WARM_PATH_WEIGHTS) as (keyof typeof WARM_PATH_WEIGHTS)[]).map((k) => (
                      <div key={k}>
                        <div className="mb-1 flex justify-between text-[11.5px]">
                          <span className="text-ink-2">
                            {COMPONENT_LABELS[k]} <span className="text-muted">× {WARM_PATH_WEIGHTS[k]}</span>
                          </span>
                          <span className="tnum font-mono">{path.components[k].toFixed(2)}</span>
                        </div>
                        <Meter value={path.components[k]} label={COMPONENT_LABELS[k]} />
                      </div>
                    ))}
                    <ul className="space-y-1 border-t border-line pt-3 font-mono text-[11px] leading-relaxed text-ink-2">
                      {path.explanation.map((e) => (
                        <li key={e}>{e}</li>
                      ))}
                    </ul>
                    <details className="border-t border-line pt-2">
                      <summary className="cursor-pointer text-xs font-medium text-accent">Evidence drawer ({path.evidence.length} events)</summary>
                      <EvidenceList ids={path.evidence} />
                    </details>
                  </div>
                )}
              </div>
            )}
          </Card>

          <Card title="Engagement timeline" subtitle="Every interaction with the account, newest first">
            <ol className="max-h-[440px] divide-y divide-line overflow-y-auto">
              {timeline.length === 0 && <Empty title="No interactions yet" />}
              {timeline.map((t) => (
                <li key={t.event.id} className="flex gap-3 px-5 py-2.5">
                  <span className="tnum w-12 shrink-0 font-mono text-[11px] text-muted">{t.date}</span>
                  <div className="min-w-0">
                    <p className="text-[12.5px] text-ink">{t.title}</p>
                    {t.detail && <p className="line-clamp-1 text-[11.5px] text-muted">{t.kind === "content" ? `“${t.detail}”` : t.detail}</p>}
                  </div>
                  <Badge className="ml-auto self-start" mono>
                    {t.event.source}
                  </Badge>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Path evolution" subtitle="Same search, graph as it stood 14 days ago vs today">
            <div className="space-y-3 px-5 py-4 text-[13px]">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted">14 days ago</p>
                <p className="text-ink">{before[0] ? before[0].nodeIds.map(name).join(" → ") : "No path"}</p>
                {before[0] && <p className="tnum font-mono text-xs text-muted">score {before[0].score.toFixed(2)}</p>}
                {before.find((p) => p.hops.length > 1) && before[0]?.hops.length === 1 && (
                  <p className="mt-1 text-xs text-muted">2-hop route: {before.find((p) => p.hops.length > 1)!.nodeIds.map(name).join(" → ")} ({before.find((p) => p.hops.length > 1)!.score.toFixed(2)})</p>
                )}
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted">Today</p>
                <p className="text-ink">{paths[0] ? paths[0].nodeIds.map(name).join(" → ") : "No path"}</p>
                {paths[0] && <p className="tnum font-mono text-xs text-muted">score {paths[0].score.toFixed(2)}</p>}
              </div>
              {before[0] && paths[0] && paths[0].score > before[0].score && (
                <p className="rounded-lg bg-accent-soft px-3 py-2 text-xs text-accent-ink">
                  Path strengthened by {(paths[0].score - before[0].score).toFixed(2)}. Open the evidence drawer to see which events did it.
                </p>
              )}
            </div>
          </Card>

          <Card title="Signals" subtitle="Derived from stored events only">
            <ul className="divide-y divide-line">
              {acct.signals.length === 0 && <Empty title="No open signals" />}
              {acct.signals.map((s) => (
                <li key={s.id} className="px-5 py-3">
                  <Badge tone={s.type === "champion_risk" ? "danger" : "accent"}>{SIGNAL_LABELS[s.type]}</Badge>
                  <p className="mt-1 text-[13px] text-ink">{s.title}</p>
                  <p className="mt-0.5 text-xs text-ink-2">→ {s.recommendedAction}</p>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Stakeholders" subtitle={`${acct.people.length} known people`}>
            <ul className="divide-y divide-line">
              {acct.people.map((p) => {
                const touches = ws.resolved.filter((e) => e.actorId === p.id && ws.now - Date.parse(e.occurredAt) < 30 * DAY_MS).length;
                const last = ws.resolved.filter((e) => e.actorId === p.id || e.subjectId === p.id).at(-1);
                return (
                  <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-ink">{p.name}</p>
                      <p className="truncate text-[11.5px] text-muted">
                        {p.title} · last touch {last ? formatRelative(last.occurredAt) : "never"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="tnum text-[13px]">{touches}</p>
                      <p className="text-[10.5px] text-muted">30d</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
