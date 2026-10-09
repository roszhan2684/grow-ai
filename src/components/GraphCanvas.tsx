"use client";

import { useMemo, useState } from "react";
import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY, type SimulationNodeDatum } from "d3-force";
import type { VizEdge, VizKind, VizNode } from "@/lib/graph-view";
import { formatDate } from "@/core/lib/time";

type SimNode = SimulationNodeDatum & { id: string; kind: VizKind };


const RADIUS: Record<VizKind, number> = { team: 9, person: 5.5, advisor: 7, company: 8, home: 9, post: 3, topic: 4, opportunity: 6 };
const FILL: Record<VizKind, string> = {
  team: "var(--viz-team)",
  person: "var(--viz-person)",
  advisor: "var(--viz-person)",
  company: "var(--ink)",
  home: "var(--ink)",
  post: "var(--viz-muted)",
  topic: "var(--viz-muted)",
  opportunity: "var(--viz-deal)",
};

/** Deterministic layout: d3-force seeds positions with a phyllotaxis and uses a fixed-seed LCG for jiggle. */
function layout(nodes: VizNode[], edges: VizEdge[], W: number, height: number) {
  const sim: SimNode[] = nodes.map((n) => ({ id: n.id, kind: n.kind }));
  const links = edges.map((e) => ({ source: e.from, target: e.to, type: e.type, strength: e.strength }));
  const s = forceSimulation(sim)
    .force(
      "link",
      forceLink<SimNode, (typeof links)[number]>(links)
        .id((d) => d.id)
        .distance((l) => (l.type === "WORKS_AT" ? 34 : l.type === "CREATED_OPPORTUNITY" ? 26 : 110 - l.strength * 40))
        .strength((l) => (l.type === "WORKS_AT" ? 0.8 : 0.12)),
    )
    .force("charge", forceManyBody<SimNode>().strength((d) => (d.kind === "company" ? -520 : d.kind === "home" || d.kind === "team" ? -380 : -110)).distanceMax(600))
    .force("collide", forceCollide<SimNode>((d) => RADIUS[d.kind] + 9))
    .force("x", forceX(0).strength(0.05 * (height / W)))
    .force("y", forceY(0).strength(0.05))
    .stop();
  for (let i = 0; i < 420; i++) s.tick();
  const xs = sim.map((n) => n.x ?? 0);
  const ys = sim.map((n) => n.y ?? 0);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const pad = 46;
  const k = Math.min((W - pad * 2) / Math.max(1, maxX - minX), (height - pad * 2) / Math.max(1, maxY - minY));
  const pos = new Map<string, { x: number; y: number }>();
  for (const n of sim) pos.set(n.id, { x: pad + ((n.x ?? 0) - minX) * k + (W - pad * 2 - (maxX - minX) * k) / 2, y: pad + ((n.y ?? 0) - minY) * k + (height - pad * 2 - (maxY - minY) * k) / 2 });
  return pos;
}

export function GraphCanvas({
  nodes,
  edges,
  height = 560,
  width = 1000,
  cutoff,
  highlight,
  selectedNode,
  selectedEdge,
  onSelectNode,
  onSelectEdge,
  labels = "important",
  pulseWindowDays = 5,
  ariaLabel = "Relationship graph",
}: {
  nodes: VizNode[];
  edges: VizEdge[];
  height?: number;
  width?: number;
  cutoff?: string;
  highlight?: string[];
  selectedNode?: string;
  selectedEdge?: string;
  onSelectNode?: (id: string) => void;
  onSelectEdge?: (key: string) => void;
  labels?: "important" | "all" | "none";
  pulseWindowDays?: number;
  ariaLabel?: string;
}) {
  const W = width;
  const pos = useMemo(() => layout(nodes, edges, W, height), [nodes, edges, W, height]);
  const [hover, setHover] = useState<string | null>(null);

  const visibleEdges = cutoff ? edges.filter((e) => e.firstSeenAt <= cutoff) : edges;
  const visibleNodeIds = new Set<string>();
  for (const e of visibleEdges) {
    visibleNodeIds.add(e.from);
    visibleNodeIds.add(e.to);
  }
  for (const n of nodes) if (n.kind === "team" || n.kind === "company" || n.kind === "home") visibleNodeIds.add(n.id);

  const hl = new Set(highlight ?? []);
  const hlPairs = new Set<string>();
  if (highlight) for (let i = 0; i < highlight.length - 1; i++) hlPairs.add([highlight[i], highlight[i + 1]].sort().join("|"));
  const isNew = (iso: string) => !!cutoff && Date.parse(cutoff) - Date.parse(iso) < pulseWindowDays * 86_400_000;

  // Greedy label placement: highest-priority labels claim space first; colliding labels are skipped.
  const labelled = new Set<string>();
  if (labels !== "none") {
    const prio = (n: VizNode) => (hl.has(n.id) || selectedNode === n.id ? 0 : n.kind === "team" ? 1 : n.kind === "company" || n.kind === "home" ? 2 : n.kind === "advisor" ? 3 : 4);
    const boxes: [number, number, number, number][] = [];
    const candidates = nodes
      .filter((n) => visibleNodeIds.has(n.id) && (labels === "all" || prio(n) < 4))
      .sort((a, b) => prio(a) - prio(b) || b.influence - a.influence);
    for (const n of candidates) {
      const p = pos.get(n.id)!;
      const w = n.name.length * 6.6 + 6;
      const box: [number, number, number, number] = [p.x - w / 2, p.y - RADIUS[n.kind] - 20, p.x + w / 2, p.y - RADIUS[n.kind] - 4];
      if (boxes.some((b) => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1])) continue;
      boxes.push(box);
      labelled.add(n.id);
    }
  }

  const hoverNode = hover ? nodes.find((n) => n.id === hover) : undefined;
  const hp = hoverNode ? pos.get(hoverNode.id) : undefined;
  const neighborIds = new Set<string>();
  if (hover)
    for (const e of visibleEdges)
      if (e.from === hover || e.to === hover) {
        neighborIds.add(e.from);
        neighborIds.add(e.to);
      }

  return (
    <div className="relative w-full select-none">
      <svg viewBox={`0 0 ${W} ${height}`} className="h-auto w-full" role="img" aria-label={ariaLabel}>
        <g>
          {visibleEdges.map((e) => {
            const a = pos.get(e.from);
            const b = pos.get(e.to);
            if (!a || !b) return null;
            const onPath = hlPairs.has([e.from, e.to].sort().join("|")) && e.type !== "WORKS_AT";
            const dim = (highlight && !onPath) || (hover && !(e.from === hover || e.to === hover));
            const structural = e.type === "WORKS_AT" || e.type === "CREATED_OPPORTUNITY" || e.type === "POSTED";
            const w = onPath ? 3 : structural ? 0.8 : 0.8 + e.strength * 2.2;
            const o = onPath ? 1 : dim ? 0.08 : structural ? 0.25 : 0.25 + e.strength * 0.5;
            const fresh = isNew(e.firstSeenAt);
            return (
              <g key={e.key + (fresh ? cutoff : "")}>
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={onPath ? "var(--accent)" : e.type === "KNOWS" || e.type === "MET_WITH" || e.type === "CONNECTED_TO" ? "var(--ink-2)" : "var(--subtle)"}
                  strokeWidth={w}
                  strokeOpacity={o}
                  strokeDasharray={e.ended ? "4 4" : undefined}
                  className={fresh ? "edge-new" : undefined}
                  style={{ ["--edge-o" as string]: o, ["--edge-w" as string]: w }}
                />
                {onSelectEdge && !structural && (
                  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="transparent" strokeWidth={12} className="cursor-pointer" onClick={() => onSelectEdge(e.key)}>
                    <title>{`${e.type} · strength ${e.strength.toFixed(2)} · ${e.evidence.length} evidence`}</title>
                  </line>
                )}
                {selectedEdge === e.key && <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--viz-deal)" strokeWidth={3.5} strokeOpacity={0.9} />}
              </g>
            );
          })}
        </g>
        <g>
          {nodes.map((n) => {
            if (!visibleNodeIds.has(n.id)) return null;
            const p = pos.get(n.id)!;
            const r = RADIUS[n.kind] + (n.kind === "person" ? n.influence * 4 : 0);
            const dim = (highlight && !hl.has(n.id) && n.kind !== "company") || (hover && !neighborIds.has(n.id) && hover !== n.id);
            const showLabel = labelled.has(n.id);
            const square = n.kind === "company" || n.kind === "home";
            return (
              <g
                key={n.id}
                transform={`translate(${p.x},${p.y})`}
                opacity={dim ? 0.22 : 1}
                className={onSelectNode ? "cursor-pointer" : undefined}
                onMouseEnter={() => setHover(n.id)}
                onMouseLeave={() => setHover(null)}
                onClick={() => onSelectNode?.(n.id)}
                tabIndex={onSelectNode ? 0 : undefined}
                onKeyDown={(ev) => (ev.key === "Enter" || ev.key === " ") && onSelectNode?.(n.id)}
                role={onSelectNode ? "button" : undefined}
                aria-label={`${n.name}${n.sub ? `, ${n.sub}` : ""}`}
              >
                <circle r={r + 9} fill="transparent" />
                {square ? (
                  <rect x={-r} y={-r} width={r * 2} height={r * 2} rx={2.5} fill={FILL[n.kind]} stroke={n.kind === "home" ? "var(--viz-team)" : "var(--surface)"} strokeWidth={n.kind === "home" ? 2.5 : 2} />
                ) : (
                  <circle r={r} fill={FILL[n.kind]} stroke={hl.has(n.id) || selectedNode === n.id ? "var(--ink)" : "var(--surface)"} strokeWidth={hl.has(n.id) || selectedNode === n.id ? 2.5 : 1.75} />
                )}
                {n.kind === "advisor" && <circle r={r + 3} fill="none" stroke="var(--viz-person)" strokeWidth={1.25} strokeDasharray="2 2" />}
                {showLabel && (
                  <text y={-r - 6} textAnchor="middle" className="pointer-events-none" style={{ font: `${n.kind === "company" || n.kind === "home" ? 600 : 500} 12px var(--font-inter)`, fill: "var(--ink)", paintOrder: "stroke", stroke: "var(--canvas)", strokeWidth: 4, strokeLinejoin: "round" }}>
                    {n.name}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>
      {hoverNode && hp && (
        <div className="pointer-events-none absolute z-10 w-56 -translate-x-1/2 rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-lg" style={{ left: `${(hp.x / W) * 100}%`, top: `calc(${(hp.y / height) * 100}% + 14px)` }}>
          <p className="font-semibold text-ink">{hoverNode.name}</p>
          <p className="text-muted">{hoverNode.sub}</p>
          <div className="mt-1.5 flex justify-between text-[11px] text-ink-2">
            <span>Influence {hoverNode.influence.toFixed(2)}</span>
            {hoverNode.lastTouch && <span>Last touch {formatDate(hoverNode.lastTouch)}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

export function GraphLegend() {
  const item = (shape: "circle" | "square" | "ring", color: string, label: string) => (
    <span className="inline-flex items-center gap-1.5">
      <svg width="12" height="12" aria-hidden>
        {shape === "square" ? <rect x="1" y="1" width="10" height="10" rx="2" fill={color} /> : <circle cx="6" cy="6" r={shape === "ring" ? 4 : 5} fill={color} stroke={shape === "ring" ? color : "none"} strokeDasharray={shape === "ring" ? "2 2" : undefined} />}
      </svg>
      {label}
    </span>
  );
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-2">
      {item("circle", "var(--viz-team)", "Team member")}
      {item("circle", "var(--viz-person)", "Prospect")}
      {item("ring", "var(--viz-person)", "Advisor / other")}
      {item("square", "var(--ink)", "Company")}
      {item("circle", "var(--viz-deal)", "Opportunity")}
      <span className="inline-flex items-center gap-1.5">
        <svg width="18" height="6" aria-hidden>
          <line x1="0" y1="3" x2="18" y2="3" stroke="var(--accent)" strokeWidth="3" />
        </svg>
        Warm path
      </span>
    </div>
  );
}
