"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useDemo } from "@/lib/demo-store";
import { Badge, Button, Card, SectionTitle, StatusBadge, cx } from "@/components/ui";
import { PERSONA_STRATEGY, OVERLAP_THRESHOLD, overlapMatrix, runChecks } from "@/core/content/engine";
import { companyName } from "@/core/workspace";
import { DAY_MS, formatDate } from "@/core/lib/time";
import type { PersonaRole } from "@/core/contracts";

const PERSONA_KEY: Record<PersonaRole, string> = { ceo: "maya", vp_sales: "daniel", head_marketing: "priya" };
const PIPELINE = ["Retrieve persona memory", "Retrieve campaign context", "Generate angle briefs (not posts)", "Overlap check across briefs", "Generate drafts independently", "Factuality · duplication · forbidden-claim · style checks", "Human review / edit / approve", "Record approval + engagement as graph events"];

export function CampaignsView() {
  const { ws, state, actions } = useDemo();
  const [cid, setCid] = useState(ws.campaigns[0]!.id);
  const campaign = ws.campaigns.find((c) => c.id === cid)!;
  const gen = ws.campaignDrafts.get(cid)!;
  const drafts = useMemo(() => gen.drafts.map((d) => ({ ...d, body: state.draftEdits[d.id] ?? d.body })), [gen, state.draftEdits]);
  const live = drafts.map((d) => ({ ...d, checks: runChecks(d.body, d.persona, campaign, drafts) }));
  const matrix = overlapMatrix(drafts, campaign);
  const approvedAny = live.some((d) => state.draftStatus[d.id] === "approved");
  const days = Array.from({ length: 7 }, (_, i) => new Date(ws.now + i * DAY_MS).toISOString());

  return (
    <div>
      <SectionTitle eyebrow="Campaigns · Narrative planner" title="One theme, three executive voices">
        <div className="flex gap-1.5" role="tablist">
          {ws.campaigns.map((c) => (
            <button key={c.id} role="tab" aria-selected={c.id === cid} onClick={() => setCid(c.id)} className={cx("rounded-lg border px-3 py-1.5 text-[12.5px]", c.id === cid ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink-2 hover:bg-surface-2")}>
              {c.theme}
            </button>
          ))}
        </div>
      </SectionTitle>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <Card title="Campaign" subtitle={campaign.objective}>
            <dl className="grid gap-x-6 gap-y-3 px-5 py-4 text-[13px] md:grid-cols-2">
              <div>
                <dt className="text-xs text-muted">Theme</dt>
                <dd className="font-medium">{campaign.theme}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Audience</dt>
                <dd>{campaign.audience}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Target accounts (auto: accounts with a warming signal)</dt>
                <dd className="mt-1 flex flex-wrap gap-1">
                  {campaign.targetAccounts.map((id) => (
                    <Link key={id} href={`/app/accounts/${id}`}>
                      <Badge tone="accent">{companyName(ws, id)}</Badge>
                    </Link>
                  ))}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Forbidden claims</dt>
                <dd className="mt-1 flex flex-wrap gap-1">
                  {campaign.forbiddenClaims.map((f) => (
                    <Badge key={f} tone="danger">
                      {f}
                    </Badge>
                  ))}
                </dd>
              </div>
              <div className="md:col-span-2">
                <dt className="text-xs text-muted">Proof points (the only facts a draft may assert)</dt>
                <dd>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4 text-ink-2">
                    {campaign.proofPoints.map((p) => (
                      <li key={p.id}>{p.text}</li>
                    ))}
                  </ul>
                </dd>
              </div>
            </dl>
          </Card>

          <Card title="Angle briefs" subtitle="Generated first so overlap is caught before any post is written">
            <div className="grid divide-y divide-line md:grid-cols-3 md:divide-x md:divide-y-0">
              {gen.briefs.map((b) => (
                <div key={b.persona} className="px-5 py-4">
                  <p className="text-xs font-semibold text-ink">{PERSONA_STRATEGY[b.persona].label}</p>
                  <p className="text-[11px] text-muted">{PERSONA_STRATEGY[b.persona].description}</p>
                  <p className="mt-2 text-[12.5px] text-ink-2 first-letter:uppercase">{b.thesis}</p>
                </div>
              ))}
            </div>
            <p className="border-t border-line px-5 py-2.5 font-mono text-[11px] text-muted">
              brief overlap: {gen.briefOverlap.map((m) => `${m.a}↔${m.b} ${m.similarity.toFixed(2)}`).join(" · ")} (threshold {OVERLAP_THRESHOLD})
            </p>
          </Card>

          <div className="grid gap-4 lg:grid-cols-3">
            {live.map((d) => {
              const status = state.draftStatus[d.id] ?? "pending";
              const allPass = d.checks.every((c) => c.passed);
              return (
                <article key={d.id} className="card flex flex-col">
                  <header className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
                    <div>
                      <p className="text-[13px] font-semibold">{PERSONA_STRATEGY[d.persona].label}</p>
                      <p className="text-[11px] text-muted">
                        {d.angle.replace("_", " ")} · {formatDate(d.scheduledFor)}
                      </p>
                    </div>
                    <StatusBadge status={status} />
                  </header>
                  <label className="sr-only" htmlFor={d.id}>
                    Draft body
                  </label>
                  <textarea id={d.id} value={d.body} onChange={(e) => actions.editDraft(d.id, e.target.value)} disabled={status === "approved"} rows={14} className="flex-1 resize-y border-0 bg-transparent px-4 py-3 text-[12.5px] leading-relaxed text-ink outline-none disabled:text-ink-2" />
                  <ul className="space-y-1 border-t border-line px-4 py-3">
                    {d.checks.map((c) => (
                      <li key={c.name} className="flex gap-2 text-[11.5px]">
                        <span aria-hidden className={c.passed ? "text-positive" : "text-danger"}>
                          {c.passed ? "✓" : "✕"}
                        </span>
                        <span>
                          <span className="font-medium">{c.name}</span> <span className="text-muted">— {c.detail}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                  <footer className="flex gap-2 border-t border-line px-4 py-3">
                    <Button size="sm" variant="primary" disabled={!allPass || status === "approved"} onClick={() => actions.approveDraft(d, PERSONA_KEY[d.persona])}>
                      {status === "approved" ? "Approved" : "Approve"}
                    </Button>
                    <Button size="sm" variant="ghost" disabled={status === "approved"} onClick={() => actions.rejectDraft(d)}>
                      Reject
                    </Button>
                    {state.draftEdits[d.id] && status !== "approved" && (
                      <Button size="sm" variant="ghost" onClick={() => actions.editDraft(d.id, gen.drafts.find((x) => x.id === d.id)!.body)}>
                        Revert
                      </Button>
                    )}
                  </footer>
                </article>
              );
            })}
          </div>
          <p className="text-xs text-muted">Try it: type “guaranteed 100% uptime” or a made-up percentage into a draft. The checks re-run on every keystroke and block approval.</p>

          {approvedAny && (
            <Card title="Close the loop" subtitle="Approved drafts become post events. Record synthetic engagement to watch the graph, signals and attribution update.">
              <div className="flex flex-wrap gap-2 px-5 py-4">
                {live
                  .filter((d) => state.draftStatus[d.id] === "approved")
                  .map((d) => (
                    <div key={d.id} className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => actions.recordEngagement(d.id, "grace")}>
                        Grace Wu (Acme CTO) likes “{d.title.slice(0, 28)}…”
                      </Button>
                      <Button size="sm" onClick={() => actions.recordEngagement(d.id, "zara", "This is the conversation we keep having internally.")}>
                        Zara Qureshi (Corvid) comments
                      </Button>
                    </div>
                  ))}
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card title="Generation pipeline" subtitle={`${gen.drafts[0]?.modelVersion} · deterministic`}>
            <ol className="space-y-2 px-5 py-4">
              {PIPELINE.map((s, i) => {
                const done = i < 6 || (i === 6 && approvedAny) || (i === 7 && approvedAny);
                return (
                  <li key={s} className="flex gap-2.5 text-[12.5px]">
                    <span className={cx("tnum flex size-5 shrink-0 items-center justify-center rounded-full font-mono text-[10px]", done ? "bg-accent text-white" : "border border-line-strong text-muted")}>{i + 1}</span>
                    <span className={done ? "text-ink" : "text-muted"}>{s}</span>
                  </li>
                );
              })}
            </ol>
          </Card>

          <Card title="Cross-persona overlap" subtitle={`Cosine similarity on terms + bigrams · fail ≥ ${OVERLAP_THRESHOLD}`}>
            <ul className="space-y-3 px-5 py-4">
              {matrix.map((m) => (
                <li key={m.a + m.b}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span>
                      {PERSONA_STRATEGY[m.a].label} ↔ {PERSONA_STRATEGY[m.b].label}
                    </span>
                    <span className={cx("tnum font-mono", m.similarity >= OVERLAP_THRESHOLD && "text-danger")}>{m.similarity.toFixed(2)}</span>
                  </div>
                  <div className="relative h-1.5 rounded-full bg-accent-soft">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, m.similarity * 100)}%`, background: m.similarity >= OVERLAP_THRESHOLD ? "var(--danger)" : "var(--accent)" }} />
                    <div className="absolute -top-1 h-3.5 w-px bg-ink" style={{ left: `${OVERLAP_THRESHOLD * 100}%` }} title="threshold" />
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Calendar" subtitle="Next 7 days">
            <ul className="divide-y divide-line">
              {days.map((day) => {
                const items = ws.campaigns.flatMap((c) => ws.campaignDrafts.get(c.id)!.drafts.map((d) => ({ ...d, theme: c.theme.split(" ").slice(0, 2).join(" ") }))).filter((d) => d.scheduledFor.slice(0, 10) === day.slice(0, 10));
                return (
                  <li key={day} className="flex gap-3 px-5 py-2.5">
                    <span className="tnum w-14 shrink-0 font-mono text-[11px] text-muted">{new Date(day).toLocaleDateString("en-US", { weekday: "short", day: "numeric", timeZone: "UTC" })}</span>
                    <div className="min-w-0 space-y-1">
                      {items.length === 0 && <span className="text-[11px] text-subtle">—</span>}
                      {items.map((d) => (
                        <p key={d.id} className="truncate text-[12px]">
                          <span className="font-medium">{PERSONA_STRATEGY[d.persona].label}</span> <span className="text-muted">· {d.theme}… · {state.draftStatus[d.id] ?? "pending"}</span>
                        </p>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
