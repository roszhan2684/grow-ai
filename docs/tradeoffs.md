# Tradeoffs

| Decision | Why | Cost / next step |
| --- | --- | --- |
| Modular monolith | One deploy, one type system, refactors are cheap | Split only at a real boundary (e.g. ingestion workers) |
| In-process engine for the public demo | No credentials or Docker; every visitor gets a full, resettable org; replay is trivially deterministic | Postgres/Neo4j are designed but not live; BUILD_STATUS says so |
| Graph derived from events | Rebuildable, auditable, survives a graph-store outage | Projection lag must be visible (it is) |
| Rule-based warm-path score | Explainable from day one; no data to train on | Learned scoring later, behind evaluation |
| Deterministic planner + template summaries | Reproducible traces and evals, $0 cost | Model-backed planner needs a held-out eval and stronger guardrails |
| Phrase-bank content generation | Testable overlap/claim checks | Swap in an LLM writer behind `LlmProvider`; keep the checks |
| Quantized floats in projections | Cross-engine checksum equality | 1e-9 precision is plenty for scores |
| Browser-local demo state | Works on serverless without a DB | Not shared across devices; per-viewer only |
| Per-instance webhook dedupe in the route | Honest demo of the contract on Vercel | Production uses the `raw_events` unique index |
