# Resume evidence map

Use a bullet only if its evidence column is green in BUILD_STATUS.

| Possible bullet | Code | Tests / artifacts |
| --- | --- | --- |
| Built a B2B relationship-intelligence platform in Next.js + TypeScript that models people, companies, content, meetings and opportunities as an event-sourced graph | `src/core/workspace.ts`, `src/core/graph/project.ts` | `tests/unit/graph.test.ts`, `benchmarks/results/latest.json` (seed + projection) |
| Engineered replay-safe ingestion and graph projection: dedupe on provider ID + payload hash, dead letters, deterministic checksums identical across Node and the browser | `src/core/ingest/pipeline.ts`, `graph/project.ts` (`quantize`) | `tests/replay/determinism.test.ts`, benchmark `replay.*` |
| Implemented integration reliability patterns: OAuth state + PKCE, HMAC webhooks with replay protection, encrypted tokens, backoff + jitter, Retry-After, reauth, reconciliation | `src/core/integrations/connector.ts`, `jobs/runner.ts`, `integrations/scenarios.ts`, `app/api/*` | `tests/unit/integrations.test.ts`, E2E webhook test, benchmark `failure_recovery` |
| Built a permissioned agent runtime with 13 graph-aware tools, static approval policy, idempotent approvals, prompt-injection handling and auditable traces | `src/core/agents/*` | `tests/unit/agent.test.ts`, 200-case eval in benchmark `agent_eval` |
| Developed explainable multi-touch attribution (6 models, as-of graphs, exclusions with reasons) without presenting it as causal | `src/core/attribution/models.ts` | `tests/unit/attribution.test.ts` |
| Designed Postgres schema with RLS and a Neo4j projection model | `supabase/migrations/*`, `neo4j/*`, `graph/cypher.ts` | Cypher generation tested; **not yet applied live**: say "designed", not "operated" |

Do not claim: production scale, real customers, revenue, live LinkedIn/HubSpot/Slack data, or a live Supabase/Neo4j deployment.
