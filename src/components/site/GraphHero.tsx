"use client";

import NumberFlow from "@number-flow/react";
import { useEffect, useState } from "react";
import { GraphCanvas } from "@/components/GraphCanvas";
import type { VizEdge, VizNode } from "@/lib/graph-view";

const DAY = 86_400_000;

/** The hero IS the product: the real seed graph, replayed over 90 days as events project. */
export function GraphHero({ nodes, edges, eventTimes, now, path, pathLabel }: { nodes: VizNode[]; edges: VizEdge[]; eventTimes: string[]; now: number; path: string[]; pathLabel: string }) {
  const [daysBack, setDaysBack] = useState(90);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDaysBack(0); // eslint-disable-line react-hooks/set-state-in-effect
      setPlaying(false);
    }
  }, []);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setDaysBack((d) => (d <= 0 ? (setPlaying(false), 0) : d - 1)), 75);
    return () => clearInterval(t);
  }, [playing]);

  const cutoff = new Date(now - daysBack * DAY).toISOString();
  const projected = eventTimes.filter((t) => t <= cutoff).length;
  const visibleEdges = edges.filter((e) => e.firstSeenAt <= cutoff && e.type !== "WORKS_AT").length;
  const done = daysBack === 0;

  return (
    <div className="card relative overflow-hidden shadow-[0_30px_80px_-40px_rgba(15,23,42,0.35)]">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
        <div className="flex items-center gap-1.5" aria-hidden>
          <span className="size-2.5 rounded-full bg-line-strong" />
          <span className="size-2.5 rounded-full bg-line-strong" />
          <span className="size-2.5 rounded-full bg-line-strong" />
        </div>
        <p className="font-mono text-[11px] text-muted">sample workspace · relationship graph</p>
        <button onClick={() => (setDaysBack(90), setPlaying(true))} className="rounded-md border border-line px-2 py-0.5 text-[11px] text-ink-2 hover:bg-surface-2">
          ↻ Replay
        </button>
      </div>
      <GraphCanvas nodes={nodes} edges={edges} cutoff={cutoff} highlight={done ? path : undefined} width={640} height={440} labels="important" ariaLabel="Animated relationship graph of the synthetic demo workspace" />
      <div className="grid grid-cols-3 border-t border-line text-center">
        <div className="px-3 py-2.5">
          <p className="tnum font-display text-xl font-semibold">
            <NumberFlow value={projected} />
          </p>
          <p className="text-[11px] text-muted">events projected</p>
        </div>
        <div className="border-x border-line px-3 py-2.5">
          <p className="tnum font-display text-xl font-semibold">
            <NumberFlow value={visibleEdges} />
          </p>
          <p className="text-[11px] text-muted">relationships</p>
        </div>
        <div className="px-3 py-2.5">
          <p className="tnum font-mono text-[15px] font-medium leading-7">{done ? "today" : `−${daysBack}d`}</p>
          <p className="text-[11px] text-muted">time machine</p>
        </div>
      </div>
      <div className={`absolute bottom-[76px] left-3 max-w-[300px] rounded-lg border border-[#bfe3dc] bg-surface/95 px-3 py-2 text-[12px] shadow-sm transition-opacity duration-500 ${done ? "opacity-100" : "opacity-0"}`} aria-hidden={!done}>
        <p className="font-medium text-accent-ink">Warmest path into Acme Robotics</p>
        <p className="text-ink-2">{pathLabel}</p>
      </div>
    </div>
  );
}
