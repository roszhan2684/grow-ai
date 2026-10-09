"use client";

import NumberFlow from "@number-flow/react";
import { useState } from "react";
import { useDemo } from "@/lib/demo-store";
import { Badge, Card, SectionTitle, cx, money } from "@/components/ui";
import { MODELS, MODEL_LABELS, ATTRIBUTION_VERSION, type AttributionModel } from "@/core/attribution/models";
import { companyName } from "@/core/workspace";
import { formatDate } from "@/core/lib/time";

export function AttributionView() {
  const { ws } = useDemo();
  const [oppId, setOppId] = useState(ws.opportunities.find((o) => o.companyId === "co_acme-robotics")?.id ?? ws.opportunities[0]!.id);
  const [left, setLeft] = useState<AttributionModel>("last_touch");
  const [right, setRight] = useState<AttributionModel>("graph_assisted");
  const opp = ws.opportunities.find((o) => o.id === oppId)!;
  const a = ws.attributionFor(opp, left);
  const b = ws.attributionFor(opp, right);
  const maxW = Math.max(0.01, ...a.touches.map((t) => t.weight), ...b.touches.map((t) => t.weight));

  const picker = (value: AttributionModel, set: (m: AttributionModel) => void, label: string) => (
    <label className="flex items-center gap-2 text-xs">
      <span className="text-muted">{label}</span>
      <select value={value} onChange={(e) => set(e.target.value as AttributionModel)} className="rounded-md border border-line bg-surface px-2 py-1">
        {MODELS.map((m) => (
          <option key={m} value={m}>
            {MODEL_LABELS[m]}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div>
      <SectionTitle eyebrow="Attribution" title="Which touches contributed, and how much">
        <Badge mono>{ATTRIBUTION_VERSION}</Badge>
      </SectionTitle>

      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Opportunity">
        {ws.opportunities.map((o) => (
          <button key={o.id} role="tab" aria-selected={o.id === oppId} onClick={() => setOppId(o.id)} className={cx("rounded-lg border px-3 py-2 text-left", o.id === oppId ? "border-ink bg-surface shadow-[0_0_0_1px_var(--ink)]" : "border-line bg-surface hover:border-line-strong")}>
            <p className="text-[12.5px] font-medium">{companyName(ws, o.companyId)}</p>
            <p className="text-[11px] text-muted">
              {o.stage.replace("_", " ")} · {money(o.amount)}
            </p>
          </button>
        ))}
      </div>

      <div className="mb-4 rounded-xl border border-[#f3d9b1] bg-[#fdf3e3] px-4 py-3 text-[12.5px] text-warning">
        <strong>Not causal proof.</strong> {a.caveats[0]} Amounts and touches are synthetic demo data.
      </div>

      <Card
        title={`${opp.name} · opened ${formatDate(opp.openedAt)}`}
        subtitle={`${a.touches.length} eligible touches · ${a.excluded.length} excluded · confidence ${b.confidence}`}
        action={
          <div className="flex flex-wrap gap-3">
            {picker(left, setLeft, "Compare")}
            {picker(right, setRight, "with")}
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-[12.5px]">
            <thead className="border-b border-line text-[11px] uppercase tracking-wide text-muted">
              <tr>
                <th className="px-5 py-2.5 font-medium">Touch</th>
                <th className="w-[26%] px-3 py-2.5 font-medium">{MODEL_LABELS[left]}</th>
                <th className="w-[26%] px-3 py-2.5 font-medium">{MODEL_LABELS[right]}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {a.touches.map((t, i) => {
                const wb = b.touches[i]!.weight;
                return (
                  <tr key={t.eventId}>
                    <td className="px-5 py-2.5">
                      <p className="text-ink">{t.label}</p>
                      <p className="font-mono text-[10.5px] text-muted">
                        {formatDate(t.occurredAt)} · {t.daysBeforeOpen.toFixed(1)}d before open · {t.eventId}
                      </p>
                    </td>
                    {[t.weight, wb].map((w, j) => (
                      <td key={j} className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="h-2.5 flex-1 rounded-r-[4px] bg-surface-2">
                            <div className="h-full rounded-r-[4px] transition-[width] duration-500" style={{ width: `${(w / maxW) * 100}%`, background: j === 0 ? "var(--viz-muted)" : "var(--accent)" }} />
                          </div>
                          <span className="tnum w-12 text-right font-mono text-[11.5px]">
                            <NumberFlow value={w} format={{ style: "percent", maximumFractionDigits: 1 }} />
                          </span>
                        </div>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t border-line text-xs text-muted">
              <tr>
                <td className="px-5 py-2">Sum of weights</td>
                <td className="tnum px-3 py-2 font-mono">{a.touches.reduce((s, t) => s + t.weight, 0).toFixed(6)}</td>
                <td className="tnum px-3 py-2 font-mono">{b.touches.reduce((s, t) => s + t.weight, 0).toFixed(6)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title={`How ${MODEL_LABELS[right]} explains each weight`}>
          <ul className="max-h-[360px] divide-y divide-line overflow-y-auto">
            {[...b.touches]
              .sort((x, y) => y.weight - x.weight)
              .map((t) => (
                <li key={t.eventId} className="px-5 py-2.5">
                  <div className="flex justify-between gap-2 text-[12.5px]">
                    <span>{t.label}</span>
                    <span className="tnum font-mono">{(t.weight * 100).toFixed(1)}%</span>
                  </div>
                  <p className="font-mono text-[10.5px] text-muted">{t.explanation}</p>
                </li>
              ))}
          </ul>
        </Card>
        <div className="space-y-6">
          <Card title="Excluded touches" subtitle="Shown so nothing is silently dropped">
            <ul className="divide-y divide-line">
              {a.excluded.length === 0 && <li className="px-5 py-3 text-xs text-muted">None</li>}
              {a.excluded.map((x) => (
                <li key={x.eventId} className="px-5 py-2.5 text-[12.5px]">
                  {x.label} <span className="text-muted">— {x.reason}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card title="Caveats">
            <ul className="list-disc space-y-1.5 py-3 pr-5 pl-9 text-[12.5px] text-ink-2">
              {[...new Set([...a.caveats, ...b.caveats])].map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
