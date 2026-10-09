/**
 * Failure injection ("Break it"). Each scenario drives the REAL pipeline pieces — job runner,
 * webhook verification, ingest dedupe, graph projection, agent runtime — under an injected fault
 * and returns the log plus machine-checked assertions. The UI panel and the test suite call the
 * same functions, so what the demo shows is what CI verifies.
 */
import type { RawEvent } from "../contracts";
import { createRng } from "../lib/rng";
import { DEMO_NOW } from "../lib/time";
import { createLogger, type LogLine } from "../observability/log";
import { createClock, JobRunner, RETRY_POLICY } from "../jobs/runner";
import { ingest } from "../ingest/pipeline";
import { buildWorkspace } from "../workspace";
import { graphChecksum, projectGraph } from "../graph/project";
import { resolveIdentities } from "../identity/resolve";
import { signWebhook, verifySignedWebhook } from "./connector";
import { runAgent } from "../agents/runtime";
import { deterministicProvider, flakyProvider } from "../agents/llm";

export const FAILURES = ["rate_limit", "auth_expired", "auth_revoked", "server_error", "duplicate_webhook", "graph_unavailable", "llm_timeout", "partial_batch"] as const;
export type FailureKind = (typeof FAILURES)[number];

export const FAILURE_META: Record<FailureKind, { label: string; code: string; expectation: string }> = {
  rate_limit: { label: "Rate limit", code: "429", expectation: "Honor Retry-After, resume from cursor, no lost or duplicated pages." },
  auth_expired: { label: "Expired token", code: "401", expectation: "Refresh once, retry, stay HEALTHY." },
  auth_revoked: { label: "Revoked grant", code: "401 + invalid_grant", expectation: "Stop, mark REAUTH_REQUIRED, keep cursor; reconnect resumes with zero drift." },
  server_error: { label: "Provider 5xx", code: "503", expectation: "Exponential backoff with jitter; dead-letter after 5 attempts." },
  duplicate_webhook: { label: "Duplicate webhook", code: "×5", expectation: "Verify every signature; normalize exactly once." },
  graph_unavailable: { label: "Neo4j outage", code: "ServiceUnavailable", expectation: "Keep events in Postgres, serve last projection, catch up to an identical checksum." },
  llm_timeout: { label: "LLM timeout", code: "timeout", expectation: "Retry once, fall back to template, never duplicate side effects." },
  partial_batch: { label: "Partial batch", code: "2/10 invalid", expectation: "Commit valid items, dead-letter invalid ones with a readable cause." },
};

export type Assertion = { name: string; passed: boolean; detail: string };
export type ScenarioResult = { kind: FailureKind; logs: LogLine[]; assertions: Assertion[]; outcome: string; finalStatus?: string };

const assert = (name: string, passed: boolean, detail: string): Assertion => ({ name, passed, detail });

function pagesOf(events: RawEvent[], size = 20) {
  const pages: RawEvent[][] = [];
  for (let i = 0; i < events.length; i += size) pages.push(events.slice(i, i + size));
  return pages;
}

export async function runScenario(kind: FailureKind, seedEvents: readonly RawEvent[]): Promise<ScenarioResult> {
  const clock = createClock(DEMO_NOW);
  const log = createLogger({ org_id: "org_demo", integration_id: kind.includes("webhook") ? "int_hubspot" : "int_social" }, () => clock.now() - DEMO_NOW);
  const rng = createRng(7);
  const jobs = new JobRunner(clock, rng, log);
  const social = seedEvents.filter((e) => e.provider === "social");
  const hubspot = seedEvents.filter((e) => e.provider === "hubspot");

  /** Shared cursor-based sync loop with a per-page fault function. */
  const sync = async (pages: RawEvent[][], fault: (page: number, attempt: number) => { status: number; retryAfterMs?: number } | null, start = 0) => {
    const delivered: RawEvent[] = [];
    let cursor = start;
    let status = "HEALTHY";
    let refreshes = 0;
    for (let p = start; p < pages.length; p++) {
      const job = await jobs.run("sync_integration", `sync:social:page:${p}`, async (attempt) => {
        const f = fault(p, attempt);
        if (!f) return { kind: "success", value: pages[p]!.length };
        log.warn(`GET /events?cursor=${p} → ${f.status}`, { attempt });
        if (f.status === 429) return { kind: "retryable_failure", reason: "429 Too Many Requests", retryAfterMs: f.retryAfterMs };
        if (f.status === 401) {
          refreshes++;
          const refresh = await jobs.run("refresh_tokens", `refresh:${p}:${refreshes}`, () =>
            kind === "auth_revoked" ? { kind: "permanent_failure", reason: "invalid_grant: refresh token revoked by user" } : { kind: "success", value: "rotated" },
          );
          if (refresh.status !== "succeeded") return { kind: "permanent_failure", reason: "401 and token refresh failed → REAUTH_REQUIRED" };
          log.info("access token refreshed (token values redacted)", { access_token: "xoxb-should-never-appear", expires_in: 3600 });
          return { kind: "retryable_failure", reason: "401 Unauthorized (token refreshed)", retryAfterMs: 0 };
        }
        return { kind: "retryable_failure", reason: `${f.status} Service Unavailable` };
      });
      if (job.status !== "succeeded") {
        status = kind === "auth_revoked" ? "REAUTH_REQUIRED" : "DEGRADED";
        log.error(`sync halted at cursor ${cursor}; integration → ${status}`);
        break;
      }
      delivered.push(...pages[p]!);
      cursor = p + 1;
      log.info(`page ${p} committed (${pages[p]!.length} events) · cursor=${cursor}`);
    }
    return { delivered, cursor, status, refreshes };
  };

  switch (kind) {
    case "rate_limit": {
      const pages = pagesOf(social);
      const r = await sync(pages, (p, a) => (p === 2 && a === 1 ? { status: 429, retryAfterMs: 2000 } : null));
      const ing = ingest(r.delivered);
      const page2 = jobs.records.find((j) => j.idempotencyKey === "sync:social:page:2")!;
      return {
        kind,
        logs: log.lines,
        finalStatus: r.status,
        outcome: `Synced ${r.delivered.length}/${social.length} events after honoring Retry-After.`,
        assertions: [
          assert("All pages delivered", r.cursor === pages.length, `cursor ${r.cursor}/${pages.length}`),
          assert("Retry-After honored", page2.finishedAt - page2.startedAt >= 2000, `waited ${page2.finishedAt - page2.startedAt}ms ≥ 2000ms`),
          assert("No duplicate normalization", ing.stats.normalized + ing.stats.deadLetters + ing.stats.duplicates === r.delivered.length, `${ing.stats.normalized} normalized, ${ing.stats.duplicates} provider duplicates`),
        ],
      };
    }
    case "auth_expired":
    case "auth_revoked": {
      const pages = pagesOf(social);
      const r = await sync(pages, (p, a) => (p === 1 && a === 1 ? { status: 401 } : null));
      const tokensInLogs = log.lines.some((l) => JSON.stringify(l).includes("xoxb-"));
      if (kind === "auth_expired") {
        return {
          kind,
          logs: log.lines,
          finalStatus: r.status,
          outcome: "Token refreshed once; sync completed.",
          assertions: [
            assert("Refreshed exactly once", r.refreshes === 1, `${r.refreshes} refresh`),
            assert("Integration stays HEALTHY", r.status === "HEALTHY", r.status),
            assert("Tokens never logged", !tokensInLogs, tokensInLogs ? "token found in logs" : "redacted"),
          ],
        };
      }
      const driftBefore = social.length - r.delivered.length;
      log.info("user reconnects integration → resume from stored cursor", { cursor: r.cursor });
      const resumed = await sync(pages, () => null, r.cursor);
      const total = r.delivered.length + resumed.delivered.length;
      log.info(`reconciliation: provider=${social.length} observed=${total} drift=${social.length - total}`);
      return {
        kind,
        logs: log.lines,
        finalStatus: r.status,
        outcome: `Marked REAUTH_REQUIRED at cursor ${r.cursor}; reconnect resumed with zero drift.`,
        assertions: [
          assert("Marked REAUTH_REQUIRED", r.status === "REAUTH_REQUIRED", r.status),
          assert("Cursor preserved at last committed page", r.cursor === 1, `cursor=${r.cursor}`),
          assert("Reconciliation drift detected before reconnect", driftBefore > 0, `${driftBefore} events missing`),
          assert("Zero drift after resume", total === social.length, `${total}/${social.length}`),
          assert("Tokens never logged", !tokensInLogs, tokensInLogs ? "token found in logs" : "redacted"),
        ],
      };
    }
    case "server_error": {
      const pages = pagesOf(social);
      const r = await sync(pages, (p, a) => (p === 3 && a <= 3 ? { status: 503 } : null));
      const page3 = jobs.records.find((j) => j.idempotencyKey === "sync:social:page:3")!;
      // Persistent outage on a fresh runner: must dead-letter, not loop forever.
      const dl = await new JobRunner(createClock(DEMO_NOW), createRng(9), log).run("sync_integration", "sync:hubspot:persistent", () => ({ kind: "retryable_failure", reason: "503 Service Unavailable" }));
      const delays = log.lines.filter((l) => l.msg.includes("backoff+jitter") && l.msg.includes("sync_integration")).map((l) => Number(/in (\d+)ms/.exec(l.msg)?.[1]));
      return {
        kind,
        logs: log.lines,
        finalStatus: r.status,
        outcome: `Recovered after ${page3.attempts} attempts; persistent outage dead-lettered after ${dl.attempts}.`,
        assertions: [
          assert("Transient 5xx recovered", r.cursor === pages.length && page3.attempts === 4, `page 3 attempts=${page3.attempts}`),
          assert("Backoff grows exponentially", delays.slice(0, 3).every((d, i, a) => i === 0 || d > a[i - 1]!), delays.slice(0, 3).join("ms → ") + "ms"),
          assert(`Dead-letter after ${RETRY_POLICY.maxAttempts} attempts`, dl.status === "dead_letter" && dl.attempts === RETRY_POLICY.maxAttempts, `${dl.status} after ${dl.attempts}`),
        ],
      };
    }
    case "duplicate_webhook": {
      const secret = "whsec_demo_only";
      const event = hubspot.find((e) => e.kind === "meeting.created")!;
      const body = JSON.stringify(event);
      const url = "https://grow-ai.example/api/webhooks/hubspot";
      const accepted: RawEvent[] = [];
      const seen = new Set<string>();
      for (let i = 0; i < 5; i++) {
        const ts = clock.now();
        const sig = await signWebhook(secret, "POST", url, body, ts);
        const v = await verifySignedWebhook({ headers: { "x-grow-signature": sig, "x-grow-timestamp": String(ts) }, body, method: "POST", url }, secret, clock.now(), seen);
        log.info(`delivery ${i + 1}: signature ${v.ok ? "valid" : `rejected (${v.reason})`}`);
        if (v.ok) accepted.push(JSON.parse(body));
        clock.advance(30_000);
      }
      const forged = await verifySignedWebhook({ headers: { "x-grow-signature": "AAAA", "x-grow-timestamp": String(clock.now()) }, body, method: "POST", url }, secret, clock.now());
      log.warn(`forged delivery: ${forged.ok ? "accepted" : `rejected (${forged.reason})`}`);
      const ing = ingest(accepted);
      log.info(`ingest: ${ing.stats.normalized} normalized, ${ing.stats.duplicates} duplicates recorded`);
      const single = ingest([event]);
      return {
        kind,
        logs: log.lines,
        outcome: `5 deliveries → 1 normalized event, 4 recorded duplicates.`,
        assertions: [
          assert("All genuine signatures verified", accepted.length === 5, `${accepted.length}/5`),
          assert("Forged signature rejected", !forged.ok, forged.ok ? "accepted" : forged.reason),
          assert("Normalized exactly once", ing.stats.normalized === 1 && ing.stats.duplicates === 4, `${ing.stats.normalized} normalized / ${ing.stats.duplicates} duplicates`),
          assert("Same end state as one delivery", JSON.stringify(ing.normalized) === JSON.stringify(single.normalized), "normalized output identical"),
        ],
      };
    }
    case "graph_unavailable": {
      const cutoff = Math.floor(seedEvents.length * 0.8);
      log.info(`graph projection healthy through raw event #${cutoff}`);
      const job = await jobs.run("project_graph", "project:batch:tail", (attempt) =>
        attempt <= 2 ? { kind: "retryable_failure", reason: "Neo4j ServiceUnavailable: connection refused" } : { kind: "success", value: "projected" },
      );
      const degraded = buildWorkspace(seedEvents, { graphFrozenAtRaw: cutoff });
      log.warn(`serving last good projection · projection lag = ${degraded.projectionLag} events · Postgres has all ${degraded.resolved.length}`);
      const recovered = buildWorkspace(seedEvents);
      const { directory, resolved } = resolveIdentities(ingest(seedEvents).normalized);
      const rebuild = graphChecksum(projectGraph(resolved, directory));
      log.info(`graph recovered · caught up · checksum ${recovered.checksum} (clean rebuild ${rebuild})`);
      return {
        kind,
        logs: log.lines,
        outcome: `App stayed up on a stale projection (lag ${degraded.projectionLag}); catch-up matched a clean rebuild.`,
        assertions: [
          assert("Events persisted during outage", degraded.resolved.length === recovered.resolved.length, `${degraded.resolved.length} normalized events kept`),
          assert("App served degraded, not down", degraded.accounts.length === recovered.accounts.length && degraded.projectionLag > 0, `lag ${degraded.projectionLag}`),
          assert("Projection job retried then succeeded", job.status === "succeeded" && job.attempts === 3, `${job.attempts} attempts`),
          assert("Catch-up checksum equals clean rebuild", recovered.checksum === rebuild, recovered.checksum),
        ],
      };
    }
    case "llm_timeout": {
      const ws = buildWorkspace(seedEvents);
      const baseline = await runAgent(ws, "What should we do next with Acme Robotics?", { provider: deterministicProvider });
      const once = await runAgent(ws, "What should we do next with Acme Robotics?", { provider: flakyProvider(deterministicProvider, 1) });
      for (const w of once.warnings) log.warn(w);
      const twice = await runAgent(ws, "What should we do next with Acme Robotics?", { provider: flakyProvider(deterministicProvider, 2) });
      for (const w of twice.warnings) log.warn(w);
      log.info(`pending side effects: baseline=${baseline.pending.length} retry=${once.pending.length} fallback=${twice.pending.length}`);
      return {
        kind,
        logs: log.lines,
        outcome: "Retried once, then fell back to a template summary. Side effects not duplicated.",
        assertions: [
          assert("Recovered on retry", once.llmAttempts === 2 && once.summary.length > 0, `${once.llmAttempts} attempts`),
          assert("Template fallback after 2 timeouts", twice.summary.length > 0 && twice.warnings.some((w) => w.includes("fallback")), "fallback used"),
          assert("No duplicated side effects", once.pending.length === baseline.pending.length && twice.pending.length === baseline.pending.length, `${baseline.pending.length} pending in every run`),
          assert("Idempotency keys stable across retries", JSON.stringify(once.pending.map((p) => p.idempotencyKey)) === JSON.stringify(baseline.pending.map((p) => p.idempotencyKey)), "keys identical"),
        ],
      };
    }
    case "partial_batch": {
      const batch = social.filter((e) => e.kind === "reaction.like").slice(0, 10).map((e, i) => (i === 3 || i === 7 ? { ...e, providerEventId: `${e.providerEventId}_bad`, payload: { ...e.payload, postId: 42 } } : e));
      const ing = ingest(batch);
      for (const r of ing.raw) log[r.status === "dead_letter" ? "error" : "info"](`${r.providerEventId}: ${r.status}${r.error ? ` — ${r.error}` : ""}`);
      return {
        kind,
        logs: log.lines,
        outcome: `${ing.stats.normalized} committed, ${ing.stats.deadLetters} dead-lettered with readable causes.`,
        assertions: [
          assert("Valid items committed", ing.stats.normalized === 8, `${ing.stats.normalized}/8`),
          assert("Invalid items dead-lettered", ing.stats.deadLetters === 2, `${ing.stats.deadLetters}/2`),
          assert("Causes are human-readable", ing.raw.filter((r) => r.status === "dead_letter").every((r) => /postId/.test(r.error ?? "")), ing.raw.find((r) => r.error)?.error ?? ""),
        ],
      };
    }
  }
}
