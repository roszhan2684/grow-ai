import { describe, expect, it } from "vitest";
import { generateSeed } from "@/core/seed/generate";
import { buildWorkspace } from "@/core/workspace";
import { MODELS } from "@/core/attribution/models";

const ws = buildWorkspace(generateSeed().rawEvents);

describe("attribution", () => {
  for (const opp of ws.opportunities) {
    for (const model of MODELS) {
      it(`${opp.crmExternalId} · ${model}: weights sum to 1 and carry the causal caveat`, () => {
        const r = ws.attributionFor(opp, model);
        if (r.touches.length) expect(r.touches.reduce((s, t) => s + t.weight, 0)).toBeCloseTo(1, 9);
        expect(r.caveats[0]).toMatch(/not causal proof/);
        for (const t of r.touches) expect(Date.parse(t.occurredAt)).toBeLessThanOrEqual(Date.parse(opp.openedAt));
      });
    }
  }

  it("graph-assisted gives the warm intro more credit than last-touch does on Acme", () => {
    const acme = ws.opportunities.find((o) => o.companyId === "co_acme-robotics")!;
    const intro = (m: (typeof MODELS)[number]) => ws.attributionFor(acme, m).touches.find((t) => t.type === "introduction_made")!.weight;
    expect(intro("graph_assisted")).toBeGreaterThan(intro("last_touch"));
    const top = [...ws.attributionFor(acme, "graph_assisted").touches].sort((a, b) => b.weight - a.weight)[0]!;
    expect(top.type).toBe("introduction_made");
  });

  it("excludes touches after the opportunity opened, with reasons", () => {
    const acme = ws.opportunities.find((o) => o.companyId === "co_acme-robotics")!;
    const r = ws.attributionFor(acme, "linear");
    expect(r.excluded.length).toBeGreaterThan(0);
    expect(r.excluded.every((x) => x.reason.length > 0)).toBe(true);
  });

  it("position-based splits 40/20/40", () => {
    const acme = ws.opportunities.find((o) => o.companyId === "co_acme-robotics")!;
    const t = ws.attributionFor(acme, "position_based").touches;
    expect(t[0]!.weight).toBeCloseTo(0.4, 9);
    expect(t.at(-1)!.weight).toBeCloseTo(0.4, 9);
  });
});
