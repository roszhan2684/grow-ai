"use client";

import { useEffect, useMemo, useState } from "react";
import { useDemo } from "@/lib/demo-store";
import { Badge, Button, Card, Empty, SectionTitle, cx } from "@/components/ui";
import { GraphCanvas, GraphLegend } from "@/components/GraphCanvas";
import { EvidenceList } from "@/components/Evidence";
import { buildGraphView, DEFAULT_TYPES, RELATIONSHIP_TYPES } from "@/lib/graph-view";
import type { EdgeType } from "@/core/graph/project";
import { DAY_MS, formatDate } from "@/core/lib/time";
import { personName, companyName } from "@/core/workspace";

export function GraphExplorerView() {
  const { ws } = useDemo();
  const [types, setTypes] = useState<EdgeType[]>(DEFAULT_TYPES);
  const [range, setRange] = useState<30 | 60 | 90>(90);
  const [daysBack, setDaysBack] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [node, setNode] = useState<string | undefined>();
  const [edge, setEdge] = useState<string | undefined>();
  const team = [...ws.directory.people.values()].filter((p) => p.isTeamMember);
  const [source, setSource] = useState<string>("any");
  const [target, setTarget] = useState<string>("");

  const view = useMemo(() => buildGraphView(ws, { types, includeContent: types.includes("ENGAGED_WITH") }), [ws, types]);
  const cutoff = new Date(ws.now - daysBack * DAY_MS).toISOString();
  const windowStart = new Date(ws.now - range * DAY_MS).toISOString();
  const edges = useMemo(() => view.edges.filter((e) => e.lastSeenAt >= windowStart || e.type === "WORKS_AT"), [view.edges, windowStart]);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      setDaysBack((d) => {
        if (d <= 0) {
          setPlaying(false);
          return 0;
        }
        return d - 1;
      });
    }, 110);
    return () => clearInterval(t);
  }, [playing]);

  const path = target ? (ws.warmPaths.get(target) ?? []).find((p) => source === "any" || p.sourceId === source) : undefined;
  const selNode = node ? view.nodes.find((n) => n.id === node) : undefined;
  const selEdge = edge ? ws.graph.edges.get(edge) : undefined;
  const nodeEdges = node ? [...ws.graph.edges.values()].filter((e) => (e.from === node || e.to === node) && ["KNOWS", "CONNECTED_TO", "MET_WITH", "ENGAGED_WITH", "COMMENTED_ON"].includes(e.type)) : [];
  const label = (id: string) => ws.graph.nodes.get(id)?.name ?? id;

  return (
    <div>
      <SectionTitle eyebrow="Graph" title="Relationship explorer">
        <Badge mono>
          {ws.graph.version} · checksum {ws.checksum}
        </Badge>
      </SectionTitle>

      <div className="card mb-4 flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
        <fieldset className="flex flex-wrap items-center gap-1.5">
          <legend className="sr-only">Relationship types</legend>
          {RELATIONSHIP_TYPES.map((t) => (
            <button key={t} onClick={() => setTypes((ts) => (ts.includes(t) ? ts.filter((x) => x !== t) : [...ts, t]))} aria-pressed={types.includes(t)} className={cx("rounded-md border px-2 py-1 font-mono text-[10.5px]", types.includes(t) ? "border-ink bg-ink text-white" : "border-line text-ink-2 hover:bg-surface-2")}>
              {t}
            </button>
          ))}
        </fieldset>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-muted">Window</span>
          {([30, 60, 90] as const).map((r) => (
            <button key={r} onClick={() => setRange(r)} aria-pressed={range === r} className={cx("rounded-md border px-2 py-1", range === r ? "border-accent bg-accent-soft text-accent-ink" : "border-line text-ink-2")}>
              {r}d
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted">Path mode</span>
          <select value={source} onChange={(e) => setSource(e.target.value)} className="rounded-md border border-line bg-surface px-2 py-1" aria-label="Path source">
            <option value="any">Any team member</option>
            {team.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <span aria-hidden>→</span>
          <select value={target} onChange={(e) => setTarget(e.target.value)} className="rounded-md border border-line bg-surface px-2 py-1" aria-label="Path destination">
            <option value="">Choose account…</option>
            {ws.targets.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-2.5">
            <GraphLegend />
            <span className="text-[11px] text-muted">Hover a node · click a node or edge for evidence</span>
          </div>
          <div className="p-2">
            <GraphCanvas nodes={view.nodes} edges={edges} cutoff={cutoff} highlight={path?.nodeIds} selectedNode={node} selectedEdge={edge} onSelectNode={(id) => (setNode(id), setEdge(undefined))} onSelectEdge={(k) => (setEdge(k), setNode(undefined))} height={620} />
          </div>
          <div className="flex items-center gap-3 border-t border-line px-4 py-3">
            <Button size="sm" onClick={() => (daysBack === 0 ? (setDaysBack(range), setPlaying(true)) : setPlaying((p) => !p))}>
              {playing ? "Pause" : daysBack === 0 ? `▶ Replay ${range} days` : "▶ Play"}
            </Button>
            <label className="flex flex-1 items-center gap-3 text-xs text-muted">
              <span className="sr-only">Time scrubber</span>
              <input type="range" min={0} max={range} value={range - daysBack} onChange={(e) => (setPlaying(false), setDaysBack(range - Number(e.target.value)))} className="w-full accent-[var(--accent)]" />
              <span className="tnum w-28 text-right font-mono text-ink">{daysBack === 0 ? "today" : `${formatDate(cutoff)} (−${daysBack}d)`}</span>
            </label>
          </div>
        </Card>

        <div className="space-y-4">
          {path && (
            <Card title="Warmest path" subtitle={`${companyName(ws, target)} · score ${path.score.toFixed(2)}`}>
              <div className="px-5 py-3">
                <p className="text-[13px] font-medium text-ink">{path.nodeIds.map((id) => personName(ws, id)).join(" → ")}</p>
                <ul className="mt-2 space-y-1 font-mono text-[11px] text-ink-2">
                  {path.explanation.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </div>
            </Card>
          )}
          {target && !path && (
            <Card title="No path">
              <Empty title="No warm path from this team member within 3 hops" />
            </Card>
          )}
          {selNode && (
            <Card title={selNode.name} subtitle={selNode.sub}>
              <dl className="grid grid-cols-2 gap-2 px-5 py-3 text-xs">
                <dt className="text-muted">Influence</dt>
                <dd className="tnum text-right">{selNode.influence.toFixed(2)}</dd>
                <dt className="text-muted">Last touch</dt>
                <dd className="text-right">{selNode.lastTouch ? formatDate(selNode.lastTouch) : "—"}</dd>
                <dt className="text-muted">Identity confidence</dt>
                <dd className="tnum text-right">{ws.directory.people.get(selNode.id)?.identityConfidence.toFixed(2) ?? "—"}</dd>
              </dl>
              <ul className="divide-y divide-line border-t border-line">
                {nodeEdges.slice(0, 10).map((e) => (
                  <li key={e.key}>
                    <button onClick={() => (setEdge(e.key), setNode(undefined))} className="flex w-full justify-between gap-2 px-5 py-2 text-left text-xs hover:bg-surface-2">
                      <span className="truncate">
                        <span className="font-mono text-[10.5px] text-muted">{e.type}</span> {label(e.from === selNode.id ? e.to : e.from)}
                      </span>
                      <span className="tnum font-mono">{e.strength.toFixed(2)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {selEdge && (
            <Card title={`${label(selEdge.from)} —${selEdge.type}→ ${label(selEdge.to)}`} subtitle={`strength ${selEdge.strength.toFixed(2)} · confidence ${selEdge.confidence.toFixed(2)} · ${selEdge.sources.join(", ")} · first ${formatDate(selEdge.firstSeenAt)} · last ${formatDate(selEdge.lastSeenAt)}`}>
              <div className="px-5 py-2">
                <EvidenceList ids={selEdge.evidence} />
              </div>
            </Card>
          )}
          {!selNode && !selEdge && !target && (
            <Card title="How to read this">
              <ul className="space-y-2 px-5 py-4 text-[12.5px] text-ink-2">
                <li>Edge thickness and opacity encode relationship strength (saturating sum of interactions).</li>
                <li>Dashed edges are ended relationships, e.g. a champion who changed company.</li>
                <li>The scrubber replays the graph over time. New edges pulse as they project.</li>
                <li>Every edge stores the event IDs that created it. Click one to see them.</li>
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
