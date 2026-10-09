# Neo4j projections

`npm run graph:export` regenerates `neo4j/fixtures/seed.cypher` from the in-process projection
(idempotent `MERGE` statements, org-partitioned). The generator is unit-tested; executing the
file against a live Neo4j instance has not been verified in this build (no Docker on the build
machine). Run `constraints.cypher` first.
