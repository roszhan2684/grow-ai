"use client";

import { useDemo, SEED } from "@/lib/demo-store";
import { Badge, Button, Card, SectionTitle, StatusBadge } from "@/components/ui";
import { BreakIt } from "@/components/BreakIt";
import { RETRY_POLICY } from "@/core/jobs/runner";
import { ageInDays, formatDate } from "@/core/lib/time";

export function JobsView() {
  const { ws, state, actions } = useDemo();
  const raw = ws.ingest.raw;
  const freshest = ws.integrations.map((i) => (i.lastSyncAt ? ageInDays(i.lastSyncAt, ws.now) : 99));
  const successRate = ws.ingest.stats.normalized / Math.max(1, ws.ingest.stats.normalized + ws.ingest.stats.deadLetters);
  const dead = ws.integrations.reduce((s, i) => s + i.deadLetters, 0);

  const jobs = [
    ...ws.integrations.map((i) => ({ type: "sync_integration", key: `sync:${i.provider}:${i.cursor}`, status: i.deadLetters ? "degraded" : "succeeded", detail: `${i.received} received · ${i.duplicates} dupes · ${i.deadLetters} dead` })),
    { type: "normalize_event", key: `normalize:${raw.length}`, status: dead ? "degraded" : "succeeded", detail: `${ws.ingest.stats.normalized} normalized` },
    { type: "resolve_identity", key: `identity:${ws.resolved.length}`, status: "succeeded", detail: `${ws.directory.issues.length} issues raised` },
    { type: "project_graph", key: `project:${ws.graph.version}:${ws.checksum}`, status: state.graphOutageAt !== null ? "retrying" : "succeeded", detail: state.graphOutageAt !== null ? `Neo4j unavailable · lag ${ws.projectionLag}` : `${ws.graph.nodes.size} nodes · ${ws.graph.edges.size} edges` },
    { type: "recompute_signals", key: `signals:${ws.signals.length}`, status: "succeeded", detail: `${ws.signals.length} signals` },
    { type: "recompute_attribution", key: `attr:${ws.opportunities.length}`, status: "succeeded", detail: `${ws.opportunities.length} opportunities × 6 models` },
    { type: "generate_campaign_drafts", key: `drafts:${ws.campaigns.length}`, status: "succeeded", detail: `${ws.campaigns.length * 3} drafts` },
  ];

  return (
    <div>
      <SectionTitle eyebrow="Jobs & Health" title="Reliability, made visible">
        <Badge mono>
          retry: {RETRY_POLICY.maxAttempts} attempts · {RETRY_POLICY.baseMs}ms×2ⁿ + ≤{RETRY_POLICY.jitterMs}ms jitter
        </Badge>
      </SectionTitle>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Connector freshness", `${Math.max(...freshest).toFixed(1)}d`, "oldest last successful sync"],
          ["Normalize success rate", `${(successRate * 100).toFixed(1)}%`, `${ws.ingest.stats.deadLetters} dead-lettered`],
          ["Graph projection lag", ws.projectionLag, state.graphOutageAt !== null ? "outage injected" : "events behind Postgres"],
          ["Dead letters", dead, `${ws.repairedDeadLetters.size} repaired & replayed`],
        ].map(([l, v, s]) => (
          <div key={l as string} className="card px-4 py-3">
            <p className="text-xs text-muted">{l}</p>
            <p className="tnum mt-1 font-display text-2xl font-semibold">{v}</p>
            <p className="text-[11px] text-muted">{s}</p>
          </div>
        ))}
      </div>

      <Card title="Break it" subtitle="Inject a fault. Each scenario runs the real job runner, webhook verifier, ingest dedupe, projection and agent runtime, then checks its own assertions. CI runs the same scenarios." className="mb-6">
        <div className="p-4">
          <BreakIt seed={SEED.rawEvents} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3">
          <p className="text-[12.5px] text-ink-2">
            <strong>Live outage:</strong> freeze the graph store for the whole app. Pages keep working on the last projection and new events queue up as lag.
          </p>
          {state.graphOutageAt === null ? (
            <Button variant="danger" size="sm" onClick={actions.startGraphOutage}>
              Take Neo4j down
            </Button>
          ) : (
            <Button variant="primary" size="sm" onClick={actions.restoreGraph}>
              Restore &amp; replay ({ws.projectionLag} events)
            </Button>
          )}
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Latest jobs" subtitle="Derived from the current workspace build">
          <ul className="divide-y divide-line">
            {jobs.map((j) => (
              <li key={j.key} className="flex items-center justify-between gap-3 px-5 py-2.5">
                <div className="min-w-0">
                  <p className="font-mono text-[12px] text-ink">{j.type}</p>
                  <p className="truncate font-mono text-[10.5px] text-muted">{j.key}</p>
                  <p className="text-[11px] text-ink-2">{j.detail}</p>
                </div>
                <StatusBadge status={j.status === "degraded" ? "DEGRADED" : j.status === "retrying" ? "PENDING" : "SUCCEEDED"} />
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Raw event log" subtitle="Append-only. Newest first.">
          <div className="max-h-[480px] overflow-auto">
            <table className="w-full min-w-[520px] text-left text-[11.5px]">
              <tbody className="divide-y divide-line">
                {[...raw]
                  .reverse()
                  .slice(0, 40)
                  .map((r) => (
                    <tr key={r.id}>
                      <td className="px-5 py-1.5 font-mono text-muted">{formatDate(r.receivedAt)}</td>
                      <td className="px-2 py-1.5 font-mono">{r.provider}</td>
                      <td className="max-w-[200px] truncate px-2 py-1.5 font-mono">{r.kind}</td>
                      <td className="px-5 py-1.5 text-right">
                        <StatusBadge status={r.status} />
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
