/** Structured logging with mandatory redaction. Tokens and secrets never reach a log line. */

export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogContext = { org_id?: string; request_id?: string; job_id?: string; integration_id?: string; agent_run_id?: string };
export type LogLine = { t: number; level: LogLevel; msg: string; ctx: LogContext; data?: Record<string, unknown> };

const SENSITIVE_KEY = /token|secret|password|authorization|cookie|api[_-]?key|refresh/i;
const SENSITIVE_VALUE = /(gh[opsu]_[A-Za-z0-9]{8,}|xox[abprs]-[A-Za-z0-9-]{8,}|sk-[A-Za-z0-9]{8,}|Bearer\s+[A-Za-z0-9._-]{8,})/g;

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[depth]";
  if (typeof value === "string") return value.replace(SENSITIVE_VALUE, "[REDACTED]");
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, SENSITIVE_KEY.test(k) ? "[REDACTED]" : redact(v, depth + 1)]));
  }
  return value;
}

export function createLogger(base: LogContext = {}, clock: () => number = () => 0) {
  const lines: LogLine[] = [];
  const log = (level: LogLevel, msg: string, data?: Record<string, unknown>, ctx: LogContext = {}) => {
    lines.push({ t: clock(), level, msg: redact(msg) as string, ctx: { ...base, ...ctx }, data: data ? (redact(data) as Record<string, unknown>) : undefined });
  };
  return {
    lines,
    debug: (m: string, d?: Record<string, unknown>, c?: LogContext) => log("debug", m, d, c),
    info: (m: string, d?: Record<string, unknown>, c?: LogContext) => log("info", m, d, c),
    warn: (m: string, d?: Record<string, unknown>, c?: LogContext) => log("warn", m, d, c),
    error: (m: string, d?: Record<string, unknown>, c?: LogContext) => log("error", m, d, c),
  };
}
export type Logger = ReturnType<typeof createLogger>;
