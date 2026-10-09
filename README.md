# GROW AI

**Turn B2B relationships into a system.** GROW AI models the people, content, meetings and deals behind B2B pipeline as a graph, turns that graph into evidence-backed next actions, and explains which touches contributed to revenue without pretending attribution is causal proof.

> Independent portfolio project. Every company, person, post and dollar amount in the demo is **synthetic** (`.example` domains). Every engineering number below comes from a checked-in artifact, never typed by hand.

**Live demo** → https://grow-ai-ten.vercel.app/app · **24s launch film** → https://grow-ai-ten.vercel.app/demo · **Website** → https://grow-ai-ten.vercel.app · **Benchmarks** → [docs/BENCHMARKS.md](docs/BENCHMARKS.md) · **What's real vs. not** → [docs/BUILD_STATUS.md](docs/BUILD_STATUS.md)

---

## Why this problem

Trust in B2B compounds across dozens of human touches: a CEO's post, a VP's reply, an advisor's intro, a meeting. Those touches live in five tools, so teams can't see who is warming up, can't find the warm way in, and fall back to last-touch attribution, which hands 100% of the credit to whatever happened last.

## The golden demo (90 seconds)

1. **Overview**: accounts warming in the last 14 days, computed from the event log.
2. **Acme Robotics**: five stakeholders engaging on reliability; the account is warming.
3. **Warm path**: 14 days ago the CEO's route to Acme's VP Engineering went *through an advisor*; the advisor's intro made it direct (score 0.45 → 0.87). Click through to the evidence.
4. **Agent**: "What should we do next?" returns grounded recommendations with a full tool trace. The CRM write and any outbound message **pause for approval** and execute exactly once.
5. **Campaign**: one theme, three executive voices (CEO vision / VP Sales field insight / Marketing framework), with cross-persona overlap < 0.30 and live forbidden-claim checks.
6. **Attribution**: last touch vs. graph-assisted on the same touches; the advisor's intro gets the most credit, with caveats.
7. **Jobs & Health**: inject a 429, revoked token, duplicate webhook, Neo4j outage or LLM timeout and watch it recover, with assertions.

Exact clicks and talking points: [docs/FOUNDER_DEMO.md](docs/FOUNDER_DEMO.md).

## Architecture

```
providers ──► raw_events (append-only, dedupe: provider_event_id + payload hash)
                 │
                 ▼
            normalize ──► resolve identity ──► project graph ──► signals / warm paths / attribution
                 │              (confidence,        (versioned,           (evidence-linked)
                 │               no auto-merge)      checksummed)
                 ▼                                       │
          Postgres = truth                         Neo4j = derived, rebuildable
                                                         │
             Next.js 16 app  ◄── agent runtime (13 tools, static policy gate, approvals, traces)
```

- **Modular monolith** (`src/core/*`), not microservices. Each module exposes a small public surface.
- **Postgres is the system of record; the graph is derived.** Replaying the entire corpus twice produces zero new normalized events and an identical graph checksum, and the checksum is identical in Node and in Chromium (see the build log: `Math.exp` differs across V8 versions, so derived floats are quantized).
- **Every side effect returns a typed outcome** (`success | retryable_failure | permanent_failure | approval_required`) and carries an idempotency key.

Deep dives: [architecture](docs/architecture.md) · [data model](docs/data-model.md) · [connector contract](docs/connector-contract.md) · [attribution](docs/attribution.md) · [agent safety](docs/agent-safety.md) · [tradeoffs](docs/tradeoffs.md)

## Graph model

Nodes: `Person, TeamMember, Company, Post, Topic, Meeting, Opportunity, RevenueEvent` · Relationships: `WORKS_AT, KNOWS, CONNECTED_TO, POSTED, ABOUT_TOPIC, ENGAGED_WITH, COMMENTED_ON, MET_WITH, CREATED_OPPORTUNITY, ATTRIBUTED_TO` with `{first_seen_at, last_seen_at, strength, source_count, confidence, sources[], evidence[]}`.

Warm-path score (rule-based, every component stored and shown):
`0.35·relationship_strength(weakest link) + 0.25·recency + 0.15·source_diversity + 0.15·role_relevance + 0.10·engagement_momentum`

## Integration reliability

Connector SDK with OAuth state + PKCE (S256), AES-GCM token storage, HMAC webhook verification with ±5 min tolerance and replay protection, cursor sync, exponential backoff + jitter, `Retry-After`, refresh-once-then-`REAUTH_REQUIRED`, dead letters with repair + replay, reconciliation and item-level partial-batch handling. Eight failure scenarios run in CI **and** in the public demo.

| Connector | Mode |
| --- | --- |
| CSV CRM import | **live**: parse, validate, ingest, dedupe on re-import |
| HubSpot | **mock**: realistic OAuth + signed webhook contract; `POST /api/webhooks/hubspot` is real |
| Slack | **fixture**: recorded intros through the real pipeline |
| Social engagement | **fixture**: posts, likes, comments, connections |

## Agent tools and safety

13 registry tools (`search_graph, get_account_timeline, get_people_at_company, find_warm_paths, get_campaign_context, retrieve_persona_memory, create_content_draft, score_content_overlap, get_opportunity, compute_attribution, create_crm_note, schedule_draft, request_approval`) plus `send_message` (approval) and `delete_integration` (deny). Policy is a property of the tool, never of the prompt or of ingested text. The planner is deterministic and rule-based; the 200-case eval proves guarantees, not model quality.

## Attribution

First touch, last touch, linear, time decay, position based (40/20/40) and graph assisted (`event_type × recency × relationship_strength × identity_confidence × source_reliability`, normalized). Weights sum to 1, exclusions carry reasons, each opportunity is scored against an **as-of graph** (no look-ahead), and every view says: *not causal proof*.

## Benchmarks

See **[docs/BENCHMARKS.md](docs/BENCHMARKS.md)** (generated) and `benchmarks/results/latest.json` (machine-readable). Reproduce:

```bash
npm run bench
```

## Local setup

```bash
npm ci
npm run dev            # http://localhost:3000 (site) and /app (demo)
npm test               # unit + replay + failure-scenario tests (Vitest)
npm run build && npx playwright install chromium && npx playwright test   # golden-demo E2E
npm run bench          # rewrites benchmarks/results/latest.json + docs/BENCHMARKS.md
npm run graph:export   # regenerates neo4j/fixtures/seed.cypher
```

No database is needed for the demo: the event-sourced engine runs in-process against a deterministic seed, and visitor actions replay in the browser. `supabase/migrations` and `neo4j/` hold the schema, RLS and Cypher for the persistent deployment (written, not yet applied live; see BUILD_STATUS).

## Tradeoffs / what I'd do next

- Apply the Supabase schema + RLS and add an RLS test suite against a real database.
- Move jobs onto a durable runtime (trigger.dev) using the same `JobRunner` contract.
- Run the generated Cypher against Neo4j and diff checksums with the in-process projection.
- Add a model-backed draft writer behind `LlmProvider`, with a held-out eval set.
- Stripe test-mode checkout for seat upgrades; MCP server exposing `find_warm_paths`.

Full list with reasons: [docs/tradeoffs.md](docs/tradeoffs.md).
