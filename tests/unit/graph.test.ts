import { describe, expect, it } from "vitest";
import { generateSeed } from "@/core/seed/generate";
import { buildWorkspace, personName } from "@/core/workspace";
import { projectGraph, saturate } from "@/core/graph/project";
import { findWarmPaths, WARM_PATH_WEIGHTS } from "@/core/graph/warmPaths";
import { graphToCypher } from "@/core/graph/cypher";
import { daysAgo, DEMO_NOW, DAY_MS } from "@/core/lib/time";

const ws = buildWorkspace(generateSeed().rawEvents);
const ACME = "co_acme-robotics";

describe("graph projection", () => {
  it("projects the spec's node labels", () => {
    const labels = new Set([...ws.graph.nodes.values()].map((n) => n.label));
    for (const l of ["Person", "TeamMember", "Company", "Post", "Topic", "Meeting", "Opportunity", "RevenueEvent"]) expect(labels.has(l as never)).toBe(true);
  });

  it("every edge carries evidence that exists in the normalized event log", () => {
    for (const e of ws.graph.edges.values()) {
      expect(e.evidence.length).toBeGreaterThan(0);
      for (const id of e.evidence) expect(ws.eventById.has(id)).toBe(true);
    }
  });

  it("strength saturates in [0,1)", () => {
    expect(saturate(0)).toBe(0);
    expect(saturate(1000)).toBeLessThanOrEqual(1);
    for (const e of ws.graph.edges.values()) expect(e.strength).toBeGreaterThan(0);
  });

  it("ends the old WORKS_AT edge when someone changes company", () => {
    const old = [...ws.graph.edges.values()].find((e) => e.type === "WORKS_AT" && e.to === "co_brightwater-health" && e.endedAt);
    expect(old).toBeDefined();
  });

  it("renders idempotent MERGE statements for Neo4j", () => {
    const cy = graphToCypher(ws.graph);
    expect(cy.length).toBe(ws.graph.nodes.size + ws.graph.edges.size);
    expect(cy.every((s) => s.includes("MERGE"))).toBe(true);
  });
});

describe("warm paths", () => {
  it("weights sum to 1", () => {
    expect(Object.values(WARM_PATH_WEIGHTS).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
  });

  it("finds the CEO → advisor → VP Engineering path into Acme before the intro happened", () => {
    const cut = daysAgo(10);
    const events = ws.resolved.filter((e) => e.occurredAt <= cut);
    const g = projectGraph(events, ws.directory);
    const paths = findWarmPaths(g, ws.directory, events, ACME, { now: DEMO_NOW - 10 * DAY_MS });
    const viaLena = paths.find((p) => p.nodeIds.map((id) => personName(ws, id)).join(">") === "Maya Okafor>Lena Fischer>Tomas Lindqvist");
    expect(viaLena).toBeDefined();
    expect(viaLena!.hops).toHaveLength(2);
  });

  it("after the intro, the CEO has a direct, stronger path whose evidence includes the intro", () => {
    const best = ws.warmPaths.get(ACME)![0]!;
    expect(best.nodeIds.map((id) => personName(ws, id))).toEqual(["Maya Okafor", "Tomas Lindqvist"]);
    expect(best.evidence.some((id) => ws.eventById.get(id)?.type === "introduction_made")).toBe(true);
    expect(best.score).toBeGreaterThan(0.8);
  });

  it("never routes through another team member and never exceeds 3 hops", () => {
    for (const paths of ws.warmPaths.values())
      for (const p of paths) {
        expect(p.hops.length).toBeLessThanOrEqual(3);
        for (const id of p.nodeIds.slice(1)) expect(ws.directory.people.get(id)?.isTeamMember).toBe(false);
      }
  });

  it("stops routing to a champion who left the account", () => {
    const bw = ws.warmPaths.get("co_brightwater-health") ?? [];
    expect(bw.every((p) => personName(ws, p.targetId) !== "Jordan Blake")).toBe(true);
  });
});
