"use client";

import NumberFlow from "@number-flow/react";
import { useState } from "react";

type Row = { label: string; last: number; graph: number };

/** Same touches, two models. Toggle to watch credit move from the final click to the relationship. */
export function AttributionMorph({ rows }: { rows: Row[] }) {
  const [model, setModel] = useState<"last" | "graph">("graph");
  const max = Math.max(...rows.map((r) => Math.max(r.last, r.graph)), 0.01);
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
        <p className="text-[12.5px] font-medium">Acme Robotics · opportunity credit</p>
        <div className="flex rounded-lg border border-line p-0.5 text-[11.5px]" role="tablist">
          {(["last", "graph"] as const).map((m) => (
            <button key={m} role="tab" aria-selected={model === m} onClick={() => setModel(m)} className={`rounded-md px-2.5 py-1 ${model === m ? "bg-ink text-white" : "text-ink-2"}`}>
              {m === "last" ? "Last touch" : "Graph assisted"}
            </button>
          ))}
        </div>
      </div>
      <ul className="space-y-2 px-4 py-3">
        {rows.map((r) => {
          const w = model === "last" ? r.last : r.graph;
          return (
            <li key={r.label} className="grid grid-cols-[minmax(0,1fr)_120px_52px] items-center gap-3 text-[12px]">
              <span className="truncate text-ink-2">{r.label}</span>
              <span className="h-2 rounded-r-[4px] bg-surface-2">
                <span className="block h-full rounded-r-[4px] bg-accent transition-[width] duration-700 ease-out" style={{ width: `${(w / max) * 100}%` }} />
              </span>
              <span className="tnum text-right font-mono">
                <NumberFlow value={w} format={{ style: "percent", maximumFractionDigits: 0 }} />
              </span>
            </li>
          );
        })}
      </ul>
      <p className="border-t border-line px-4 py-2 text-[11px] text-muted">Credit assignment, not causal proof. Top touches shown; weights over all eligible touches sum to 100%.</p>
    </div>
  );
}
