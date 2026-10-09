/**
 * Durable-job semantics in-process: idempotency keys, typed outcomes, exponential backoff with
 * jitter, Retry-After, dead letters. Time is simulated (injected clock) so retries are testable
 * without sleeping; a trigger.dev-style runtime would supply real scheduling around the same contract.
 */
import type { Outcome } from "../contracts";
import type { Rng } from "../lib/rng";
import type { Logger } from "../observability/log";

export type JobType =
  | "sync_integration"
  | "ingest_webhook"
  | "normalize_event"
  | "resolve_identity"
  | "project_graph"
  | "recompute_signals"
  | "recompute_attribution"
  | "generate_campaign_drafts"
  | "refresh_tokens"
  | "reconcile_connector"
  | "agent_side_effect";

export type JobStatus = "succeeded" | "failed" | "dead_letter" | "approval_required";

export type JobRecord = {
  id: string;
  type: JobType;
  idempotencyKey: string;
  status: JobStatus;
  attempts: number;
  lastError?: string;
  startedAt: number;
  finishedAt: number;
  result?: unknown;
};

export const RETRY_POLICY = { maxAttempts: 5, baseMs: 500, maxMs: 30_000, jitterMs: 250 };

export function backoffMs(attempt: number, rng: Rng, policy = RETRY_POLICY) {
  const exp = Math.min(policy.maxMs, policy.baseMs * 2 ** (attempt - 1));
  return Math.round(exp + rng.next() * policy.jitterMs);
}

export type Clock = { now(): number; advance(ms: number): void };
export const createClock = (start: number): Clock => {
  let t = start;
  return { now: () => t, advance: (ms) => void (t += ms) };
};

export class JobRunner {
  readonly records: JobRecord[] = [];
  private byKey = new Map<string, JobRecord>();
  constructor(
    private clock: Clock,
    private rng: Rng,
    private log: Logger,
  ) {}

  /**
   * Run a job at most once per idempotency key. A second call with the same key returns the
   * original record without executing the side effect again.
   */
  async run<T>(type: JobType, idempotencyKey: string, fn: (attempt: number) => Promise<Outcome<T>> | Outcome<T>): Promise<JobRecord> {
    const existing = this.byKey.get(idempotencyKey);
    if (existing && existing.status === "succeeded") {
      this.log.info(`idempotency hit: ${type} ${idempotencyKey} already succeeded — skipped`, undefined, { job_id: existing.id });
      return existing;
    }
    const id = `job_${String(this.records.length + 1).padStart(4, "0")}`;
    const startedAt = this.clock.now();
    let attempts = 0;
    let lastError: string | undefined;
    while (attempts < RETRY_POLICY.maxAttempts) {
      attempts++;
      const out = await fn(attempts);
      if (out.kind === "success") return this.finish({ id, type, idempotencyKey, status: "succeeded", attempts, startedAt, finishedAt: this.clock.now(), result: out.value, lastError });
      if (out.kind === "approval_required") {
        this.log.warn(`${type}: approval required — ${out.reason}`, { approvalId: out.approvalId }, { job_id: id });
        return this.finish({ id, type, idempotencyKey, status: "approval_required", attempts, startedAt, finishedAt: this.clock.now(), lastError: out.reason });
      }
      if (out.kind === "permanent_failure") {
        this.log.error(`${type}: permanent failure → dead letter: ${out.reason}`, undefined, { job_id: id });
        return this.finish({ id, type, idempotencyKey, status: "dead_letter", attempts, startedAt, finishedAt: this.clock.now(), lastError: out.reason });
      }
      lastError = out.reason;
      const wait = out.retryAfterMs ?? backoffMs(attempts, this.rng);
      this.log.warn(`${type}: attempt ${attempts} failed (${out.reason}); retrying in ${wait}ms${out.retryAfterMs ? " (Retry-After)" : " (backoff+jitter)"}`, undefined, { job_id: id });
      this.clock.advance(wait);
    }
    this.log.error(`${type}: exhausted ${RETRY_POLICY.maxAttempts} attempts → dead letter`, undefined, { job_id: id });
    return this.finish({ id, type, idempotencyKey, status: "dead_letter", attempts, startedAt, finishedAt: this.clock.now(), lastError });
  }

  private finish(r: JobRecord) {
    this.records.push(r);
    this.byKey.set(r.idempotencyKey, r);
    if (r.status === "succeeded") this.log.info(`${r.type} succeeded after ${r.attempts} attempt${r.attempts > 1 ? "s" : ""}`, undefined, { job_id: r.id });
    return r;
  }
}
