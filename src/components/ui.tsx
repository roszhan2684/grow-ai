import Link from "next/link";
import type { ReactNode } from "react";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export function Card({ children, className, title, action, subtitle }: { children: ReactNode; className?: string; title?: ReactNode; action?: ReactNode; subtitle?: ReactNode }) {
  return (
    <section className={cx("card", className)}>
      {(title || action) && (
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-3.5">
          <div className="min-w-0">
            <h2 className="text-[13px] font-semibold tracking-tight text-ink">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

type Tone = "neutral" | "accent" | "positive" | "warning" | "danger" | "ink";
const TONES: Record<Tone, string> = {
  neutral: "bg-surface-2 text-ink-2 border-line",
  accent: "bg-accent-soft text-accent-ink border-[#bfe3dc]",
  positive: "bg-[#e8f5ec] text-positive border-[#c5e6cf]",
  warning: "bg-[#fdf3e3] text-warning border-[#f3d9b1]",
  danger: "bg-[#fdecec] text-danger border-[#f4c7c7]",
  ink: "bg-ink text-white border-ink",
};

export function Badge({ children, tone = "neutral", className, mono }: { children: ReactNode; tone?: Tone; className?: string; mono?: boolean }) {
  return <span className={cx("inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[11px] font-medium leading-none", mono && "font-mono", TONES[tone], className)}>{children}</span>;
}

/** Status always ships icon + label, never color alone. */
export function StatusBadge({ status }: { status: string }) {
  const s = status.toUpperCase();
  const map: Record<string, [Tone, string]> = {
    HEALTHY: ["positive", "●"],
    SUCCEEDED: ["positive", "✓"],
    NORMALIZED: ["positive", "✓"],
    PASSED: ["positive", "✓"],
    ALLOW: ["positive", "✓"],
    OK: ["positive", "✓"],
    APPROVED: ["positive", "✓"],
    DEGRADED: ["warning", "▲"],
    DUPLICATE: ["neutral", "≡"],
    APPROVAL_REQUIRED: ["warning", "⏸"],
    REQUIRE_APPROVAL: ["warning", "⏸"],
    PENDING: ["warning", "⏸"],
    REAUTH_REQUIRED: ["danger", "!"],
    DEAD_LETTER: ["danger", "✕"],
    DENIED: ["danger", "⊘"],
    DENY: ["danger", "⊘"],
    FAILED: ["danger", "✕"],
    REJECTED: ["danger", "✕"],
    ERROR: ["danger", "✕"],
  };
  const [tone, icon] = map[s] ?? ["neutral", "○"];
  return (
    <Badge tone={tone} mono>
      <span aria-hidden>{icon}</span>
      {s.replace(/_/g, " ")}
    </Badge>
  );
}

export function SectionTitle({ eyebrow, title, children }: { eyebrow?: string; title: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.14em] text-accent">{eyebrow}</p>}
        <h1 className="font-display text-[28px] font-semibold leading-tight text-ink">{title}</h1>
      </div>
      {children}
    </div>
  );
}

export function Stat({ label, value, sub, href }: { label: string; value: ReactNode; sub?: ReactNode; href?: string }) {
  const body = (
    <div className="card h-full px-5 py-4 transition-colors hover:border-line-strong">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1.5 font-display text-[30px] font-semibold leading-none text-ink">{value}</p>
      {sub && <p className="mt-2 text-xs text-muted">{sub}</p>}
    </div>
  );
  return href ? (
    <Link href={href} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}

/** Single-series sparkline: de-emphasized history, accent on the current period. */
export function Sparkline({ values, width = 96, height = 26, label }: { values: number[]; width?: number; height?: number; label?: string }) {
  const max = Math.max(1, ...values);
  const step = width / Math.max(1, values.length - 1);
  const pts = values.map((v, i) => [i * step, height - 3 - (v / max) * (height - 6)] as const);
  const last = pts.at(-1)!;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label ?? `Weekly interactions: ${values.join(", ")}`} className="h-auto max-w-full overflow-visible">
      <title>{label ?? `Weekly interactions, oldest → newest: ${values.join(", ")}`}</title>
      <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke="var(--viz-muted)" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r={3} fill="var(--accent)" stroke="var(--surface)" strokeWidth={1.5} />
    </svg>
  );
}

/** Horizontal meter with a lighter track of the same hue. */
export function Meter({ value, max = 1, tone = "accent", label }: { value: number; max?: number; tone?: "accent" | "warning" | "danger" | "ink"; label?: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const fill = { accent: "var(--accent)", warning: "var(--warning)", danger: "var(--danger)", ink: "var(--ink)" }[tone];
  const track = { accent: "var(--accent-soft)", warning: "#fbe9cf", danger: "#f9dada", ink: "var(--surface-2)" }[tone];
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: track }} role="meter" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={label}>
      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: fill }} />
    </div>
  );
}

export function Mono({ children, className }: { children: ReactNode; className?: string }) {
  return <code className={cx("font-mono text-[11.5px] text-ink-2", className)}>{children}</code>;
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 px-6 py-10 text-center">
      <p className="text-sm font-medium text-ink">{title}</p>
      {children && <p className="max-w-sm text-xs text-muted">{children}</p>}
    </div>
  );
}

export function Button({ children, onClick, variant = "secondary", disabled, type = "button", className, size = "md" }: { children: ReactNode; onClick?: () => void; variant?: "primary" | "secondary" | "ghost" | "danger"; disabled?: boolean; type?: "button" | "submit"; className?: string; size?: "sm" | "md" }) {
  const v = {
    primary: "bg-ink text-white hover:bg-[#1e293b] border-ink",
    secondary: "bg-surface text-ink border-line-strong hover:bg-surface-2",
    ghost: "bg-transparent text-ink-2 border-transparent hover:bg-surface-2",
    danger: "bg-surface text-danger border-[#f4c7c7] hover:bg-[#fdecec]",
  }[variant];
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cx("inline-flex items-center justify-center gap-1.5 rounded-lg border font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50", size === "sm" ? "h-7 px-2.5 text-xs" : "h-9 px-3.5 text-[13px]", v, className)}>
      {children}
    </button>
  );
}

export function money(n: number) {
  return `$${n.toLocaleString("en-US")}`;
}

export function DemoTag({ className }: { className?: string }) {
  return (
    <Badge tone="warning" className={className}>
      Sample workspace
    </Badge>
  );
}
