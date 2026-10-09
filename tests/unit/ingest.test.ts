import { describe, expect, it } from "vitest";
import { generateSeed } from "@/core/seed/generate";
import { ingest } from "@/core/ingest/pipeline";
import { resolveIdentities } from "@/core/identity/resolve";

const { rawEvents } = generateSeed();

describe("event backbone", () => {
  it("dedupes repeated provider deliveries without re-normalizing", () => {
    const r = ingest(rawEvents);
    expect(r.stats.duplicates).toBe(6);
    const again = ingest([...rawEvents, ...rawEvents]);
    expect(again.stats.normalized).toBe(r.stats.normalized);
    expect(again.normalized).toEqual(r.normalized);
  });

  it("dead-letters an invalid payload with a readable cause and keeps the batch", () => {
    const r = ingest(rawEvents);
    const dead = r.raw.filter((x) => x.status === "dead_letter");
    expect(dead).toHaveLength(1);
    expect(dead[0]!.error).toMatch(/amount must be a number/);
    expect(r.stats.normalized).toBeGreaterThan(200);
  });

  it("flags a payload conflict under a reused provider event id", () => {
    const e = rawEvents.find((x) => x.kind === "reaction.like")!;
    const r = ingest([e, { ...e, payload: { ...e.payload, postId: "post_other" } }]);
    expect(r.stats.conflicts).toBe(1);
    expect(r.raw[1]!.error).toMatch(/conflict/);
  });
});

describe("identity resolution", () => {
  const { directory, resolved } = resolveIdentities(ingest(rawEvents).normalized);

  it("seeds exactly 45 known people plus provisional identities", () => {
    const known = [...directory.people.values()].filter((p) => !p.id.startsWith("per_h_"));
    expect(known).toHaveLength(45);
  });

  it("never auto-merges an ambiguous identity", () => {
    const amb = directory.issues.find((i) => i.kind === "ambiguous_identity")!;
    expect(amb.candidates).toHaveLength(2);
    expect(directory.people.get(amb.personId)!.identityConfidence).toBeLessThan(0.5);
  });

  it("links a social handle once and resolves later references with full confidence", () => {
    const sam = [...directory.people.values()].find((p) => p.name === "Sam Patel")!;
    expect(sam.handles).toContain("sam-patel");
    const noCompanyComment = resolved.find((e) => e.type === "person_commented_post" && e.actorId === sam.id && String(e.metadata.text).startsWith("Error budgets"));
    expect(noCompanyComment?.identityConfidence).toBe(0.9);
  });

  it("records a stale identity when a champion changes company", () => {
    const stale = directory.issues.find((i) => i.kind === "stale_identity")!;
    const p = directory.people.get(stale.personId)!;
    expect(p.name).toBe("Jordan Blake");
    expect(p.previousCompanyIds).toContain("co_brightwater-health");
  });
});
