"use client";

import { useEffect, useRef, useState } from "react";
import { FAILURES, FAILURE_META, runScenario, type FailureKind, type ScenarioResult } from "@/core/integrations/scenarios";
import type { RawEvent } from "@/core/contracts";
import { Badge, cx } from "./ui";

/** Runs a real failure scenario and streams its log. The same function is asserted in CI. */
export function BreakIt({ seed, compact = false }: { seed: readonly RawEvent[]; compact?: boolean }) {
  const [kind, setKind] = useState<FailureKind | null>(null);
  const [result, setResult] = useState<ScenarioResult | null>(null);
  const [shown, setShown] = useState(0);
  const logRef = useRef<HTMLOListElement>(null);

  const run = async (k: FailureKind) => {
    setKind(k);
    setResult(null);
    setShown(0);
    setResult(await runScenario(k, seed));
  };

  useEffect(() => {
    if (!result || shown >= result.logs.length) return;
    const t = setTimeout(() => setShown((s) => s + 1), 140);
    return () => clearTimeout(t);
  }, [result, shown]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [shown]);

  const done = result && shown >= result.logs.length;

  return (
    <div className={cx("grid gap-4", !compact && "lg:grid-cols-[300px_minmax(0,1fr)]")}>
      <div className={cx("grid gap-2", compact ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 lg:grid-cols-1")}>
        {FAILURES.map((f) => (
          <button key={f} onClick={() => run(f)} aria-pressed={kind === f} className={cx("rounded-lg border px-3 py-2 text-left transition-colors", kind === f ? "border-ink bg-ink text-white" : "border-line bg-surface hover:border-line-strong")}>
            <span className="flex items-center justify-between gap-2">
              <span className="text-[12.5px] font-medium">{FAILURE_META[f].label}</span>
              <span className={cx("font-mono text-[10px]", kind === f ? "text-white/70" : "text-muted")}>{FAILURE_META[f].code}</span>
            </span>
            {!compact && <span className={cx("mt-0.5 block text-[11px] leading-snug", kind === f ? "text-white/70" : "text-muted")}>{FAILURE_META[f].expectation}</span>}
          </button>
        ))}
      </div>
      <div className="min-w-0 overflow-hidden rounded-xl border border-[#1e293b] bg-[#0b1220] text-[#d6dde8]">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
          <span className="font-mono text-[11px] text-white/60">{kind ? `inject ${kind}` : "choose a failure to inject"}</span>
          {done && (
            <Badge tone={result!.assertions.every((a) => a.passed) ? "positive" : "danger"} mono>
              {result!.assertions.filter((a) => a.passed).length}/{result!.assertions.length} assertions
            </Badge>
          )}
        </div>
        <ol ref={logRef} className="h-64 overflow-y-auto px-4 py-3 font-mono text-[11px] leading-relaxed" aria-live="polite">
          {!result && <li className="text-white/40">{kind ? "running…" : "Logs stream here: retries, backoff, refreshes, dead letters, checksums."}</li>}
          {result?.logs.slice(0, shown).map((l, i) => (
            <li key={i} className="log-in">
              <span className="text-white/35">+{String(l.t).padStart(5, " ")}ms </span>
              <span className={l.level === "error" ? "text-[#fca5a5]" : l.level === "warn" ? "text-[#fcd34d]" : "text-[#99f6e4]"}>{l.level.padEnd(5)}</span> {l.msg}
              {l.data && <span className="text-white/40"> {JSON.stringify(l.data)}</span>}
            </li>
          ))}
        </ol>
        {done && (
          <div className="border-t border-white/10 px-4 py-3">
            <p className="text-[12px] text-white">{result!.outcome}</p>
            <ul className="mt-2 space-y-1">
              {result!.assertions.map((a) => (
                <li key={a.name} className="font-mono text-[11px]">
                  <span className={a.passed ? "text-[#86efac]" : "text-[#fca5a5]"}>{a.passed ? "✓" : "✕"}</span> {a.name} <span className="text-white/45">— {a.detail}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
