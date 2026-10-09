"use client";

import Link from "next/link";
import { useDemo } from "@/lib/demo-store";
import { Badge, Card, SectionTitle, Sparkline, money } from "@/components/ui";
import { personName } from "@/core/workspace";
import { formatRelative } from "@/core/lib/time";

export function AccountsView() {
  const { ws } = useDemo();
  return (
    <div>
      <SectionTitle eyebrow="Accounts" title="Target accounts" />
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-[13px]">
            <thead className="border-b border-line text-[11px] uppercase tracking-wide text-muted">
              <tr>
                <th className="px-5 py-2.5 font-medium">Account</th>
                <th className="px-3 py-2.5 text-right font-medium">Warmth</th>
                <th className="px-3 py-2.5 text-right font-medium">Touches 14d</th>
                <th className="px-3 py-2.5 font-medium">13 weeks</th>
                <th className="px-3 py-2.5 font-medium">Best warm path</th>
                <th className="px-3 py-2.5 font-medium">Opportunity</th>
                <th className="px-5 py-2.5 font-medium">Last touch</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {ws.accounts.map((a) => (
                <tr key={a.company.id} className="hover:bg-surface-2">
                  <td className="px-5 py-3">
                    <Link href={`/app/accounts/${a.company.id}`} className="font-medium text-ink hover:text-accent">
                      {a.company.name}
                    </Link>
                    <p className="text-xs text-muted">
                      {a.company.industry} · {a.company.sizeBand}
                    </p>
                  </td>
                  <td className="tnum px-3 py-3 text-right font-semibold">{a.warmth}</td>
                  <td className="tnum px-3 py-3 text-right">{a.engagement14d}</td>
                  <td className="px-3 py-3">
                    <Sparkline values={a.weekly} />
                  </td>
                  <td className="max-w-[260px] truncate px-3 py-3 text-xs text-ink-2">
                    {a.bestPath ? (
                      <>
                        {a.bestPath.nodeIds.map((id) => personName(ws, id)).join(" → ")} <span className="tnum text-muted">({a.bestPath.score.toFixed(2)})</span>
                      </>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-xs">
                    {a.opportunity ? (
                      <>
                        <Badge tone={a.opportunity.stage === "closed_won" ? "positive" : "neutral"}>{a.opportunity.stage.replace("_", " ")}</Badge> <span className="tnum text-muted">{money(a.opportunity.amount)}</span>
                      </>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-xs text-muted">{a.lastTouchAt ? formatRelative(a.lastTouchAt) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="mt-3 text-xs text-muted">Warmth index is a transparent heuristic (see docs/data-model.md), not a prediction. Amounts are synthetic.</p>
    </div>
  );
}
