# Architecture

## Shape
A **modular monolith**: one Next.js 16 app plus pure-TypeScript domain modules under `src/core`. Background work is modeled as jobs with idempotency keys and typed outcomes (`src/core/jobs/runner.ts`) so it can move to a durable runtime without changing callers. No service is split out until a real scaling boundary exists.

## Data flow
1. **Ingest** (`ingest/pipeline.ts`): every provider event is stored before anything else. Key = `provider + provider_event_id`; same key + same payload hash = duplicate (recorded, not re-normalized); same key + different hash = conflict (first write wins, surfaced).
2. **Normalize** (`integrations/normalize.ts`): Zod-validated provider payload → domain events. The only file that knows provider shapes. Invalid payload → dead letter with a readable cause; the batch continues.
3. **Resolve identity** (`identity/resolve.ts`): email → exact; handle → learned link; name + company → 0.9; unique name → 0.7; ambiguous → provisional person (0.35) and a Data Quality issue. Never auto-merged.
4. **Project graph** (`graph/project.ts`): resolved events → nodes/edges with evidence, sources, first/last seen, saturating strength. Versioned (`proj-v3`) and checksummed. Derived floats are quantized to 1e-9 so checksums match across JS engines.
5. **Derive**: warm paths (`graph/warmPaths.ts`), signals (`signals/detect.ts`), attribution (`attribution/models.ts`, as-of graph per opportunity), campaigns (`content/engine.ts`).
6. **Act**: agent runtime (`agents/runtime.ts`) reads derived state through tools; side effects become pending approvals.

`src/core/workspace.ts` composes the pipeline: `buildWorkspace(rawEvents, options) → Workspace`. It is pure and deterministic, which is what makes replay, tests, benchmarks and the browser demo agree.

## Runtime topology (demo)
- Marketing pages and most app shells prerender at build (Cache Components). Product components on the homepage are real engine output computed at build time.
- The demo app rebuilds the workspace **in the browser** from `seed + local events` on every user action (~10 ms). Local events persist in `localStorage`; "Reset demo" drops them.
- Route handlers: `/api/webhooks/hubspot` (HMAC verification, dedupe, normalize), `/api/integrations/[provider]/authorize` (state + PKCE, httpOnly verifier cookie), `/api/agent`, `/api/health`, `/api/accounts`, `/api/warm-paths`.

## Persistent deployment (designed)
- Postgres/Supabase: `supabase/migrations` (schema, `raw_events` dedupe index, RLS via `is_member(org_id, role)`; `oauth_tokens` has no client policy at all).
- Neo4j: org-partitioned constraints; projection via generated idempotent `MERGE` statements; warm-path Cypher mirrors the TS reference.
- If Neo4j is down, the app serves the last projection and catches up from Postgres (demonstrated by the live outage toggle and the `graph_unavailable` scenario).
