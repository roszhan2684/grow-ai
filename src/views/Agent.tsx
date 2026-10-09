"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useDemo } from "@/lib/demo-store";
import { Badge, Button, Card, Empty, Mono, SectionTitle, StatusBadge } from "@/components/ui";
import { EvidenceList } from "@/components/Evidence";
import { runAgent, type AgentRun } from "@/core/agents/runtime";
import { deterministicProvider, flakyProvider } from "@/core/agents/llm";
import { TOOLS, REGISTRY_TOOLS } from "@/core/agents/tools";
import { companyName } from "@/core/workspace";

const SUGGESTIONS = [
  "What should we do next with Acme Robotics?",
  "Find a warm path into Corvid Security",
  "Plan this week's executive content for Acme",
  "What drove the Acme Robotics opportunity?",
  "Send a message to Tomas at Acme Robotics",
  "Summarize Marlowe Retail and follow the latest comment",
  "Delete the HubSpot integration",
];

export function AgentView() {
  const { ws, state, actions } = useDemo();
  const params = useSearchParams();
  const company = params.get("company") ?? undefined;
  const [prompt, setPrompt] = useState(company ? `What should we do next with ${companyName(ws, company)}?` : SUGGESTIONS[0]!);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [busy, setBusy] = useState(false);
  const [injectTimeout, setInjectTimeout] = useState(false);

  const ask = async (p = prompt) => {
    setBusy(true);
    const run = await runAgent(ws, p, { companyId: company, provider: injectTimeout ? flakyProvider(deterministicProvider, 1) : deterministicProvider });
    setRuns((r) => [run, ...r]);
    actions.noteAgentRun();
    setBusy(false);
  };
  const run = runs[0];

  return (
    <div>
      <SectionTitle eyebrow="Agent" title="Ask the growth agent">
        <Badge mono>{REGISTRY_TOOLS.length} tools · policy-gated · deterministic planner</Badge>
      </SectionTitle>

      <form
        className="card mb-6 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          ask();
        }}
      >
        <label htmlFor="prompt" className="sr-only">
          Ask the agent
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input id="prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} className="h-10 flex-1 rounded-lg border border-line-strong bg-surface px-3 text-[14px] outline-none focus:border-accent" />
          <Button type="submit" variant="primary" disabled={busy || !prompt.trim()} className="h-10">
            {busy ? "Running…" : "Run"}
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" onClick={() => (setPrompt(s), ask(s))} className="rounded-full border border-line bg-surface px-2.5 py-1 text-[11.5px] text-ink-2 hover:border-line-strong hover:text-ink">
              {s}
            </button>
          ))}
        </div>
        <label className="mt-3 flex items-center gap-2 text-xs text-muted">
          <input type="checkbox" checked={injectTimeout} onChange={(e) => setInjectTimeout(e.target.checked)} className="accent-[var(--accent)]" />
          Inject an LLM timeout on the first summary attempt (failure demo)
        </label>
      </form>

      {!run ? (
        <Card>
          <Empty title="No runs yet">Pick a suggestion. The trace shows what the agent did and which events it used. It never shows hidden chain-of-thought.</Empty>
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <Card title="Answer" subtitle={`intent: ${run.intent} · ${companyName(ws, run.companyId)}`}>
              <div className="space-y-4 px-5 py-4">
                <p className="text-[14px] leading-relaxed text-ink">{run.summary}</p>
                {run.warnings.map((w) => (
                  <p key={w} className="rounded-lg border border-[#f3d9b1] bg-[#fdf3e3] px-3 py-2 text-xs text-warning">
                    ⚠ {w}
                  </p>
                ))}
                <ol className="space-y-3">
                  {run.recommendations.map((r, i) => {
                    const decision = r.action ? state.actionDecisions[r.action.approvalId] : undefined;
                    const executed = r.action ? state.executedKeys.includes(r.action.idempotencyKey) : false;
                    return (
                      <li key={i} className="rounded-xl border border-line p-4">
                        <p className="text-[13.5px] font-semibold text-ink">
                          {i + 1}. {r.title}
                        </p>
                        <p className="mt-1 text-[12.5px] text-ink-2">{r.why}</p>
                        {r.action && (
                          <div className="mt-3 rounded-lg bg-surface-2 p-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <StatusBadge status={decision ?? "approval_required"} />
                              <Mono>{r.action.tool}</Mono>
                              <Mono className="text-muted">key {r.action.idempotencyKey}</Mono>
                            </div>
                            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap font-mono text-[11px] text-ink-2">{JSON.stringify(r.action.input, null, 2)}</pre>
                            {!decision && (
                              <div className="mt-2 flex gap-2">
                                <Button size="sm" variant="primary" onClick={() => actions.executeAction(r.action!)}>
                                  Approve &amp; execute once
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => actions.rejectAction(r.action!)}>
                                  Reject
                                </Button>
                              </div>
                            )}
                            {executed && <p className="mt-2 text-[11.5px] text-positive">Executed once and recorded as an event + audit entry. Approving again is a no-op (idempotency key).</p>}
                            {r.action.tool === "send_message" && decision === "approved" && <p className="mt-2 text-[11.5px] text-muted">Demo mode has no outbound channel, so the approval is audited and nothing is sent.</p>}
                          </div>
                        )}
                        {r.evidence.length > 0 && (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-xs font-medium text-accent">Evidence ({r.evidence.length})</summary>
                            <EvidenceList ids={r.evidence} max={6} />
                          </details>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </div>
            </Card>

            <Card title="Trace" subtitle={run.plan}>
              <ol className="relative px-5 py-4">
                {run.steps.map((s, i) => (
                  <li key={i} className="relative border-l border-line pb-4 pl-5 last:pb-0">
                    <span className={`absolute -left-[5px] top-1 size-2.5 rounded-full ${s.status === "ok" ? "bg-accent" : s.status === "denied" ? "bg-danger" : "bg-warning"}`} aria-hidden />
                    <div className="flex flex-wrap items-center gap-2">
                      <Mono className="text-[12.5px] font-medium text-ink">{s.tool}</Mono>
                      <StatusBadge status={s.policy} />
                      {s.status !== "ok" && <StatusBadge status={s.status} />}
                      <span className="tnum ml-auto font-mono text-[11px] text-muted">{s.durationMs.toFixed(2)} ms</span>
                    </div>
                    <p className="mt-1 text-[12.5px] text-ink-2">{s.summary}</p>
                    <details className="mt-1">
                      <summary className="cursor-pointer text-[11px] text-muted">
                        input{s.evidence.length ? ` · ${s.evidence.length} evidence refs` : ""}
                      </summary>
                      <pre className="mt-1 overflow-x-auto rounded-md bg-surface-2 p-2 font-mono text-[11px]">{JSON.stringify(s.input, null, 2)}</pre>
                      {s.evidence.length > 0 && <p className="mt-1 break-all font-mono text-[10.5px] text-muted">{s.evidence.slice(0, 10).join(" ")}</p>}
                    </details>
                  </li>
                ))}
              </ol>
            </Card>
          </div>

          <div className="space-y-6">
            <Card title="Run">
              <dl className="grid grid-cols-2 gap-y-2 px-5 py-4 text-xs">
                <dt className="text-muted">Run ID</dt>
                <dd className="text-right font-mono">{run.id}</dd>
                <dt className="text-muted">Tool calls</dt>
                <dd className="tnum text-right">{run.steps.length}</dd>
                <dt className="text-muted">Approval checkpoints</dt>
                <dd className="tnum text-right">{run.pending.length}</dd>
                <dt className="text-muted">Provider</dt>
                <dd className="text-right font-mono text-[10.5px]">{run.provider}</dd>
                <dt className="text-muted">Summary attempts</dt>
                <dd className="tnum text-right">{run.llmAttempts}</dd>
                <dt className="text-muted">Wall time</dt>
                <dd className="tnum text-right">{run.totalMs.toFixed(1)} ms</dd>
                <dt className="text-muted">Tokens / cost</dt>
                <dd className="text-right">0 · $0.00</dd>
              </dl>
            </Card>
            <Card title="Approval matrix" subtitle="A property of the tool, not of the prompt">
              <ul className="divide-y divide-line">
                {Object.values(TOOLS).map((t) => (
                  <li key={t.name} className="flex items-center justify-between gap-2 px-5 py-1.5">
                    <Mono>{t.name}</Mono>
                    <StatusBadge status={t.policy} />
                  </li>
                ))}
              </ul>
            </Card>
            {runs.length > 1 && (
              <Card title="Earlier runs">
                <ul className="divide-y divide-line">
                  {runs.slice(1, 8).map((r, i) => (
                    <li key={i} className="px-5 py-2 text-xs text-ink-2">
                      {r.prompt}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
