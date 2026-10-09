/** Hand-drawn system diagram. Solid = shipped and tested; dashed = written, not yet run live. */
export function ArchitectureDiagram() {
  const box = (x: number, y: number, w: number, h: number, title: string, sub: string, opts: { dashed?: boolean; accent?: boolean } = {}) => (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={10} fill={opts.accent ? "var(--accent-soft)" : "var(--surface)"} stroke={opts.accent ? "var(--accent)" : "var(--line-strong)"} strokeDasharray={opts.dashed ? "5 4" : undefined} />
      <text x={x + 14} y={y + 24} style={{ font: "600 13px var(--font-inter)", fill: "var(--ink)" }}>
        {title}
      </text>
      <text x={x + 14} y={y + 42} style={{ font: "11px var(--font-jetbrains)", fill: "var(--muted)" }}>
        {sub}
      </text>
    </g>
  );
  const arrow = (x1: number, y1: number, x2: number, y2: number, label?: string) => (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--ink-2)" strokeWidth={1.25} markerEnd="url(#arr)" />
      {label && (
        <text x={(x1 + x2) / 2 + 6} y={(y1 + y2) / 2 - 4} style={{ font: "10.5px var(--font-jetbrains)", fill: "var(--muted)" }}>
          {label}
        </text>
      )}
    </g>
  );
  return (
    <svg viewBox="0 0 960 470" className="h-auto w-full" role="img" aria-labelledby="arch-title arch-desc">
      <title id="arch-title">GROW AI architecture</title>
      <desc id="arch-desc">Providers send raw events into an append-only log. Normalization, identity resolution, graph projection, signals and attribution are derived jobs. The Next.js app and agent read the derived state. Postgres is the system of record; Neo4j is a rebuildable projection.</desc>
      <defs>
        <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="var(--ink-2)" />
        </marker>
      </defs>
      {box(20, 30, 190, 56, "CSV CRM import", "live · Zod-validated")}
      {box(20, 100, 190, 56, "HubSpot", "mock · signed webhooks")}
      {box(20, 170, 190, 56, "Slack / social", "fixtures · same pipeline")}
      {arrow(210, 128, 268, 128, "")}
      {box(270, 80, 200, 96, "raw_events", "append-only · dedupe on", { accent: true })}
      <text x={284} y={146} style={{ font: "11px var(--font-jetbrains)", fill: "var(--muted)" }}>
        provider_event_id + hash
      </text>
      {arrow(470, 128, 528, 128, "")}
      {box(530, 30, 200, 56, "normalize", "provider → domain events")}
      {box(530, 100, 200, 56, "resolve identity", "confidence · no auto-merge")}
      {box(530, 170, 200, 56, "project graph", "versioned · checksummed", { accent: true })}
      {arrow(630, 86, 630, 98)}
      {arrow(630, 156, 630, 168)}
      {box(770, 100, 170, 56, "Neo4j", "derived · rebuildable", { dashed: true })}
      {arrow(730, 198, 790, 158, "MERGE")}
      {box(270, 250, 200, 56, "Postgres / Supabase", "system of record · RLS", { dashed: true })}
      {arrow(370, 176, 370, 248)}
      {box(530, 250, 200, 56, "signals · attribution", "6 models · evidence links")}
      {arrow(630, 226, 630, 248)}
      {box(20, 340, 290, 96, "Agent runtime", "13 tools · static policy gate")}
      <text x={34} y={404} style={{ font: "11px var(--font-jetbrains)", fill: "var(--muted)" }}>
        approvals · idempotency · traces
      </text>
      {box(340, 340, 290, 96, "Next.js 16 app", "App Router · Cache Components", { accent: true })}
      <text x={354} y={404} style={{ font: "11px var(--font-jetbrains)", fill: "var(--muted)" }}>
        route handlers: webhooks, OAuth, agent
      </text>
      {box(660, 340, 280, 96, "Jobs runtime", "retries · backoff+jitter · DLQ")}
      <text x={674} y={404} style={{ font: "11px var(--font-jetbrains)", fill: "var(--muted)" }}>
        Retry-After · reauth · reconcile
      </text>
      {arrow(630, 306, 520, 338)}
      {arrow(310, 388, 338, 388)}
      {arrow(660, 388, 632, 388)}
      <g transform="translate(770 30)">
        <rect width="170" height="56" rx="10" fill="var(--surface)" stroke="var(--line)" />
        <line x1="14" y1="20" x2="40" y2="20" stroke="var(--line-strong)" />
        <text x="48" y="24" style={{ font: "11px var(--font-inter)", fill: "var(--ink-2)" }}>
          shipped + tested
        </text>
        <line x1="14" y1="40" x2="40" y2="40" stroke="var(--line-strong)" strokeDasharray="5 4" />
        <text x="48" y="44" style={{ font: "11px var(--font-inter)", fill: "var(--ink-2)" }}>
          written, not run live
        </text>
      </g>
    </svg>
  );
}
