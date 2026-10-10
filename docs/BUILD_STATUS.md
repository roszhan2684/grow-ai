# Build status

Legend: ✅ complete and tested · 🟡 partial (written, or works with stated limits) · ⛔ blocked · ⬜ not started.
Numbers referenced here live in `benchmarks/results/latest.json`.

| Phase | Gate | Status | Evidence |
| --- | --- | --- | --- |
| 0 · Foundation | One command boots; seed loads; CI green | 🟡 | `npm run dev` boots the app on the deterministic seed; CI workflow runs typecheck, lint, tests, build, E2E. No Supabase/Neo4j Docker (no Docker on the build machine). |
| 1 · Auth & activation | New user reaches activated state | 🟡 | Activation checklist derived from real state (`activationSteps`), seeded org, personas. **No real auth**: the public demo is a resettable read/demo org. |
| 2 · Event backbone | Duplicate replay does not duplicate state | ✅ | `src/core/ingest/pipeline.ts`, `tests/unit/ingest.test.ts`, `tests/replay/determinism.test.ts` |
| 3 · Graph | Target account graph + evidence drawer | ✅ | `src/core/graph/*`, Graph Explorer, Account page, `tests/unit/graph.test.ts` |
| 4 · Account intelligence | Explainable warming signals | ✅ | `src/core/signals/detect.ts`, Signals page |
| 5 · Campaigns | 3 distinct drafts pass overlap/factual checks | ✅ | `src/core/content/engine.ts`, `tests/unit/content.test.ts` |
| 6 · Agent | Evidence-grounded answers; unsafe actions blocked | ✅ | `src/core/agents/*`, 200-case eval, `tests/unit/agent.test.ts` |
| 7 · Integrations | Injected failure surfaced and recoverable | ✅ / 🟡 | CSV live; HubSpot mock with real signed-webhook route; Slack/social fixtures. No registered OAuth apps, so no live provider data. |
| 8 · Attribution | Weights sum to 1; model comparison | ✅ | `src/core/attribution/models.ts`, `tests/unit/attribution.test.ts` |
| 9 · Billing & seats | Upgrade changes seat allowance | 🟡 | Works in demo (local state + audit). Stripe test-mode checkout not wired. |
| 10 · Reliability | Break-it demo proves recovery | ✅ | `src/core/integrations/scenarios.ts`, Jobs & Health, `tests/unit/integrations.test.ts` |
| 11 · Website & docs | Understandable without repo context | ✅ | Marketing site (Home, Product, Solutions, Integrations, Security, Pricing, Contact), docs/ |
| 12 · Launch package | All claims verified, links public | ✅ | README, PRODUCT_TOUR, generated benchmarks, 24s overview film (`brag-output/brag.mp4`, on the homepage). Demo-request form needs `CONTACT_WEBHOOK_URL` / `NEXT_PUBLIC_SALES_EMAIL` set. |

## Completed
- Raw → normalized → resolved event pipeline with dedupe, conflicts, dead letters and repair + replay
- Identity resolution with confidence, handle learning, stale identity and ambiguous-identity queue with manual merge
- Graph projection (8 labels, 11 relationship types), quantized cross-engine-deterministic checksums, Cypher export
- Warm paths with 5 scored components, path evolution (as-of), collapsed parallel relationships
- Six signal types, each evidence-linked
- Six attribution models with as-of graphs and an explainability contract
- Content engine: briefs → drafts → overlap / forbidden-claim / unsupported-number / style checks; approval flow
- Agent: 13-tool registry, static policy, approvals with idempotency keys, injection flagging, traces, LLM-timeout fallback
- Connector SDK: OAuth state + PKCE, AES-GCM secrets, HMAC webhooks with tolerance + replay protection, redacting logger
- Job runner: idempotency keys, typed outcomes, backoff + jitter, Retry-After, reauth, dead letters, reconciliation
- 8 failure-injection scenarios, run in tests, benchmarks and the UI
- Marketing website (7 pages + demo-request form) and 13-screen product app on a sample workspace; Playwright E2E

## Partial
- `supabase/migrations/0001_core_schema.sql`, `0002_rls.sql`: written and reviewed, **not applied** to a live project
- `neo4j/`: constraints, warm-path Cypher and generated `fixtures/seed.cypher`: **not executed** against a live Neo4j
- `/api/webhooks/hubspot` dedupe is per serverless instance (in-memory). Production uses the `raw_events` unique index.
- Billing: plan/seat state only

## Blocked
- Live Supabase + Neo4j integration tests: need Docker or hosted instances + credentials

## Not started
- Supabase Auth, persistence of demo actions server-side
- Durable job runtime (trigger.dev)
- Stripe test-mode checkout
- MCP server
- Model-backed planner / draft writer (interface exists: `LlmProvider`)
- Temporal graph embeddings / homophily scoring, causal research view, chaos/load suite
