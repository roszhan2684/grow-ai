// Every node is partitioned by org_id; every query must bind it (graph inference leakage guard).
CREATE CONSTRAINT person_id IF NOT EXISTS FOR (n:Person) REQUIRE (n.org_id, n.id) IS UNIQUE;
CREATE CONSTRAINT team_id IF NOT EXISTS FOR (n:TeamMember) REQUIRE (n.org_id, n.id) IS UNIQUE;
CREATE CONSTRAINT company_id IF NOT EXISTS FOR (n:Company) REQUIRE (n.org_id, n.id) IS UNIQUE;
CREATE CONSTRAINT post_id IF NOT EXISTS FOR (n:Post) REQUIRE (n.org_id, n.id) IS UNIQUE;
CREATE CONSTRAINT topic_id IF NOT EXISTS FOR (n:Topic) REQUIRE (n.org_id, n.id) IS UNIQUE;
CREATE CONSTRAINT meeting_id IF NOT EXISTS FOR (n:Meeting) REQUIRE (n.org_id, n.id) IS UNIQUE;
CREATE CONSTRAINT opp_id IF NOT EXISTS FOR (n:Opportunity) REQUIRE (n.org_id, n.id) IS UNIQUE;
CREATE CONSTRAINT rev_id IF NOT EXISTS FOR (n:RevenueEvent) REQUIRE (n.org_id, n.id) IS UNIQUE;
