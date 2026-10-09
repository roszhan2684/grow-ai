// Warm paths: team member → ≤3 relationship hops → current employee of the target account.
// Mirrors src/core/graph/warmPaths.ts (the reference implementation, unit-tested).
MATCH p = (me:TeamMember {org_id: $orgId})-[:KNOWS|CONNECTED_TO|MET_WITH*1..3]-(buyer:Person {org_id: $orgId})
      -[w:WORKS_AT]->(target:Company {org_id: $orgId, id: $companyId})
WHERE w.ended_at IS NULL
  AND all(n IN nodes(p)[1..] WHERE NOT n:TeamMember)
WITH p, buyer, relationships(p) AS rels
RETURN p,
       reduce(m = 1.0, r IN rels | CASE WHEN r.strength < m THEN r.strength ELSE m END) AS weakest_link,
       size(rels) AS hops
ORDER BY weakest_link DESC, hops ASC
LIMIT 20;
