import { describe, expect, it } from "vitest";
import { defaultCampaigns, generateDrafts, runChecks, cosine, OVERLAP_THRESHOLD } from "@/core/content/engine";

const [campaign] = defaultCampaigns(["co_acme-robotics"], "2026-10-01T15:00:00.000Z");

describe("coordinated content engine", () => {
  const { drafts, briefs } = generateDrafts(campaign!);

  it("produces three differentiated persona drafts that pass every check", () => {
    expect(drafts.map((d) => d.persona)).toEqual(["ceo", "vp_sales", "head_marketing"]);
    expect(new Set(briefs.map((b) => b.angle)).size).toBe(3);
    for (const d of drafts) for (const c of d.checks) expect(c.passed, `${d.persona}: ${c.name} — ${c.detail}`).toBe(true);
  });

  it("keeps cross-persona similarity under the threshold", () => {
    for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) expect(cosine(drafts[i]!.body, drafts[j]!.body)).toBeLessThan(OVERLAP_THRESHOLD);
  });

  it("flags forbidden claims and unsupported numbers in an edited draft", () => {
    const edited = `${drafts[0]!.body}\n\nWe deliver guaranteed 100% uptime and cut incidents 47%.`;
    const checks = runChecks(edited, "ceo", campaign!, drafts);
    expect(checks.find((c) => c.name === "Forbidden claims")!.passed).toBe(false);
    expect(checks.find((c) => c.name === "Unsupported numbers")!.detail).toMatch(/47%/);
  });

  it("flags a duplicated draft", () => {
    const checks = runChecks(drafts[1]!.body, "ceo", campaign!, drafts);
    expect(checks.find((c) => c.name === "Cross-persona overlap")!.passed).toBe(false);
  });
});
