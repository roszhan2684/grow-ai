"use client";

import { useState } from "react";
import { useDemo } from "@/lib/demo-store";
import { Badge, Button, Card, Empty, Mono, SectionTitle, StatusBadge } from "@/components/ui";
import { companyName, personName } from "@/core/workspace";
import { formatDate } from "@/core/lib/time";

export function DataQualityView() {
  const { ws, state, actions } = useDemo();
  const [amount, setAmount] = useState("60000");
  const dead = ws.ingest.raw.filter((r) => r.status === "dead_letter");
  const dupes = ws.ingest.raw.filter((r) => r.status === "duplicate");
  const mergedHandles = Object.keys(state.merges);

  return (
    <div>
      <SectionTitle eyebrow="Graph · Data quality" title="Identity & data quality" />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Identity issues", ws.directory.issues.length],
          ["Dead-letter events", dead.filter((d) => !ws.repairedDeadLetters.has(d.id)).length],
          ["Duplicate deliveries absorbed", dupes.length],
          ["Low-confidence people", [...ws.directory.people.values()].filter((p) => p.identityConfidence < 0.5).length],
        ].map(([l, v]) => (
          <div key={l} className="card px-4 py-3">
            <p className="text-xs text-muted">{l}</p>
            <p className="tnum mt-1 font-display text-2xl font-semibold">{v}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Identity resolution queue" subtitle="Ambiguous matches are never auto-merged">
          <ul className="divide-y divide-line">
            {ws.directory.issues.length === 0 && <Empty title="No open identity issues" />}
            {ws.directory.issues.map((i) => {
              const handle = ws.directory.people.get(i.personId)?.handles[0];
              return (
                <li key={i.id} className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <Badge tone={i.kind === "ambiguous_identity" ? "warning" : i.kind === "stale_identity" ? "danger" : "neutral"}>{i.kind.replace("_", " ")}</Badge>
                    <Mono>{i.personId}</Mono>
                  </div>
                  <p className="mt-1.5 text-[13px] text-ink">{i.detail}</p>
                  {i.candidates.length > 0 && handle && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs text-muted">Merge into:</p>
                      {i.candidates.map((c) => {
                        const p = ws.directory.people.get(c)!;
                        return (
                          <div key={c} className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2">
                            <span className="text-[12.5px]">
                              {p.name} · {p.title} · {companyName(ws, p.companyId)}
                            </span>
                            <Button size="sm" onClick={() => actions.mergeIdentity(handle, c)}>
                              Merge
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </li>
              );
            })}
            {mergedHandles.map((h) => (
              <li key={h} className="flex items-center justify-between px-5 py-3 text-[12.5px]">
                <span>
                  <Mono>{h}</Mono> merged into {personName(ws, state.merges[h])}
                </span>
                <StatusBadge status="approved" />
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Dead-letter queue" subtitle="Invalid payloads are kept with a readable cause; repair + replay is audited">
          <ul className="divide-y divide-line">
            {dead.length === 0 && <Empty title="Dead-letter queue is empty" />}
            {dead.map((d) => {
              const repaired = ws.repairedDeadLetters.has(d.id);
              return (
                <li key={d.id} className="px-5 py-4">
                  <div className="flex items-center justify-between gap-2">
                    <Mono>
                      {d.provider}/{d.kind} · {d.providerEventId}
                    </Mono>
                    <StatusBadge status={repaired ? "normalized" : "dead_letter"} />
                  </div>
                  <p className="mt-1.5 text-[13px] text-danger">{d.error}</p>
                  <pre className="mt-2 overflow-x-auto rounded-lg bg-surface-2 p-2.5 font-mono text-[11px] text-ink-2">{JSON.stringify(d.payload, null, 2)}</pre>
                  {!repaired && d.kind === "deal.created" && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <label className="text-xs text-muted" htmlFor={`amt_${d.id}`}>
                        Corrected amount
                      </label>
                      <input id={`amt_${d.id}`} value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))} className="w-28 rounded-md border border-line bg-surface px-2 py-1 font-mono text-xs" />
                      <Button size="sm" variant="primary" onClick={() => actions.repairDeadLetter(d.id, d, { ...d.payload, amount: Number(amount) })}>
                        Repair &amp; replay
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>

        <Card title="Duplicate deliveries" subtitle="Deduplicated by provider event ID + payload hash. Recorded, never re-normalized." className="lg:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead className="border-b border-line text-[11px] uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-5 py-2 font-medium">Provider event</th>
                  <th className="px-3 py-2 font-medium">Kind</th>
                  <th className="px-3 py-2 font-medium">Payload hash</th>
                  <th className="px-3 py-2 font-medium">Received</th>
                  <th className="px-5 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {dupes.map((d) => (
                  <tr key={d.id}>
                    <td className="px-5 py-2 font-mono">
                      {d.provider}:{d.providerEventId}
                    </td>
                    <td className="px-3 py-2 font-mono">{d.kind}</td>
                    <td className="px-3 py-2 font-mono text-muted">{d.hash}</td>
                    <td className="px-3 py-2">{formatDate(d.receivedAt)}</td>
                    <td className="px-5 py-2">
                      <StatusBadge status="duplicate" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
