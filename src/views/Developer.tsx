"use client";

import { useDemo } from "@/lib/demo-store";
import { Badge, Card, Mono, SectionTitle, StatusBadge } from "@/components/ui";
import { PROJECTION_VERSION } from "@/core/graph/project";
import { ATTRIBUTION_VERSION } from "@/core/attribution/models";
import { GENERATOR_VERSION } from "@/core/content/engine";
import { SUPPORTED_KINDS } from "@/core/integrations/normalize";

const FLAGS = [
  ["graph_assisted_attribution", true, "Graph-assisted model visible in Attribution"],
  ["agent_side_effects_require_approval", true, "Policy gate (cannot be disabled in demo)"],
  ["llm_provider", "deterministic-template", "No model calls; reproducible traces"],
  ["neo4j_live_projection", false, "In-process projection is the reference; Neo4j export via Cypher"],
  ["stripe_checkout", false, "Plan changes are local + audited"],
  ["mcp_server", false, "Stretch goal, not shipped"],
] as const;

export function DeveloperView({ migrations, commit, env }: { migrations: string[]; commit: string; env: string }) {
  const { ws } = useDemo();
  const curls = [
    ["Health + checksums", "curl -s $ORIGIN/api/health | jq"],
    ["Accounts", "curl -s $ORIGIN/api/accounts | jq '.data[0]'"],
    ["Warm paths", "curl -s '$ORIGIN/api/warm-paths?company=co_acme-robotics' | jq '.paths[0]'"],
    ["Agent run (server-side)", `curl -s -X POST $ORIGIN/api/agent -H 'content-type: application/json' -d '{"prompt":"What should we do next with Acme Robotics?"}' | jq '.recommendations'`],
    ["OAuth URL (state + PKCE)", "curl -s $ORIGIN/api/integrations/hubspot/authorize | jq"],
  ];
  return (
    <div>
      <SectionTitle eyebrow="Developer" title="Under the hood" />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Environment">
          <dl className="grid grid-cols-[180px_1fr] gap-y-2 px-5 py-4 text-[12.5px]">
            <dt className="text-muted">Mode</dt>
            <dd>Public demo · in-browser event-sourced engine · synthetic seed</dd>
            <dt className="text-muted">Deployment</dt>
            <dd className="font-mono text-xs">{env}</dd>
            <dt className="text-muted">Commit</dt>
            <dd className="font-mono text-xs">{commit}</dd>
            <dt className="text-muted">Graph projection</dt>
            <dd className="font-mono text-xs">
              {PROJECTION_VERSION} · {ws.checksum}
            </dd>
            <dt className="text-muted">Normalized checksum</dt>
            <dd className="font-mono text-xs">{ws.normalizedChecksum}</dd>
            <dt className="text-muted">Attribution</dt>
            <dd className="font-mono text-xs">{ATTRIBUTION_VERSION}</dd>
            <dt className="text-muted">Content generator</dt>
            <dd className="font-mono text-xs">{GENERATOR_VERSION}</dd>
            <dt className="text-muted">Normalizers</dt>
            <dd className="font-mono text-[11px]">{SUPPORTED_KINDS.length} payload kinds</dd>
          </dl>
        </Card>
        <Card title="Schema" subtitle="supabase/migrations — immutable after merge">
          <ul className="divide-y divide-line">
            {migrations.map((m) => (
              <li key={m} className="px-5 py-2 font-mono text-[12px]">
                {m}
              </li>
            ))}
          </ul>
          <p className="border-t border-line px-5 py-2.5 text-[11.5px] text-muted">Migrations and RLS policies are written and reviewed but not yet applied to a live Supabase project (see BUILD_STATUS).</p>
        </Card>
        <Card title="Connectors">
          <ul className="divide-y divide-line">
            {ws.integrations.map((i) => (
              <li key={i.provider} className="flex items-center justify-between px-5 py-2 text-[12.5px]">
                <span>
                  {i.displayName} <Badge mono>{i.mode}</Badge>
                </span>
                <span className="flex items-center gap-2">
                  <Mono className="text-muted">{i.cursor}</Mono>
                  <StatusBadge status={i.deadLetters ? "DEGRADED" : i.status} />
                </span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Feature flags">
          <ul className="divide-y divide-line">
            {FLAGS.map(([k, v, note]) => (
              <li key={k} className="flex items-center justify-between gap-3 px-5 py-2">
                <div>
                  <Mono>{k}</Mono>
                  <p className="text-[11px] text-muted">{note}</p>
                </div>
                <Badge tone={v === true ? "positive" : v === false ? "neutral" : "accent"} mono>
                  {String(v)}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Sample API calls" className="xl:col-span-2">
          <ul className="divide-y divide-line">
            {curls.map(([l, c]) => (
              <li key={l} className="px-5 py-2.5">
                <p className="text-xs text-muted">{l}</p>
                <pre className="mt-1 overflow-x-auto font-mono text-[11.5px] text-ink">{c}</pre>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
