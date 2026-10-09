"use client";

import Link from "next/link";
import { useState } from "react";
import { useDemo } from "@/lib/demo-store";
import { Badge, Button, Meter, SectionTitle, cx } from "@/components/ui";
import { EvidenceList } from "@/components/Evidence";
import { SIGNAL_LABELS, type SignalType } from "@/core/signals/detect";
import { companyName } from "@/core/workspace";

export function SignalsView() {
  const { ws, state, actions } = useDemo();
  const [filter, setFilter] = useState<SignalType | "all">("all");
  const types = [...new Set(ws.signals.map((s) => s.type))];
  const list = ws.signals.filter((s) => filter === "all" || s.type === filter);

  return (
    <div>
      <SectionTitle eyebrow="Signals" title="What changed, and why it matters" />
      <div className="mb-4 flex flex-wrap gap-1.5">
        {(["all", ...types] as const).map((t) => (
          <button key={t} onClick={() => setFilter(t)} aria-pressed={filter === t} className={cx("rounded-md border px-2.5 py-1 text-xs", filter === t ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink-2")}>
            {t === "all" ? `All (${ws.signals.length})` : `${SIGNAL_LABELS[t]} (${ws.signals.filter((s) => s.type === t).length})`}
          </button>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {list.map((s) => {
          const status = state.signalStatus[s.id] ?? s.status;
          return (
            <article key={s.id} className={cx("card", status === "done" && "opacity-60")}>
              <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-3">
                <div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone={s.type === "champion_risk" || s.type === "integration_degradation" ? "danger" : "accent"}>{SIGNAL_LABELS[s.type]}</Badge>
                    {s.companyId && (
                      <Link href={`/app/accounts/${s.companyId}`} className="text-xs text-muted hover:text-ink">
                        {companyName(ws, s.companyId)}
                      </Link>
                    )}
                  </div>
                  <h2 className="mt-1.5 text-[13.5px] font-semibold text-ink">{s.title}</h2>
                </div>
                <Badge mono>{status}</Badge>
              </header>
              <dl className="space-y-2.5 px-5 py-3 text-[12.5px]">
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-muted">Why it matters</dt>
                  <dd className="text-ink-2">{s.why}</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-wide text-muted">Recommended action</dt>
                  <dd className="text-ink">{s.recommendedAction}</dd>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <dt className="text-[11px] uppercase tracking-wide text-muted">Confidence {s.confidence.toFixed(2)}</dt>
                    <dd className="mt-1">
                      <Meter value={s.confidence} label="Signal confidence" />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide text-muted">Owner</dt>
                    <dd>{s.owner}</dd>
                  </div>
                </div>
              </dl>
              <details className="border-t border-line px-5 py-2">
                <summary className="cursor-pointer py-1 text-xs font-medium text-accent">Evidence ({s.evidence.length} events)</summary>
                <EvidenceList ids={s.evidence} max={8} />
              </details>
              <footer className="flex gap-2 border-t border-line px-5 py-2.5">
                <Button size="sm" onClick={() => actions.setSignalStatus(s.id, "acknowledged")} disabled={status !== "open"}>
                  Acknowledge
                </Button>
                <Button size="sm" variant="ghost" onClick={() => actions.setSignalStatus(s.id, "done")} disabled={status === "done"}>
                  Mark done
                </Button>
              </footer>
            </article>
          );
        })}
      </div>
    </div>
  );
}
