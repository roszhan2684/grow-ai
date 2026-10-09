import { describe, expect, it } from "vitest";
import { generateSeed } from "@/core/seed/generate";
import { buildWorkspace } from "@/core/workspace";

describe("replay determinism", () => {
  it("the same seed always produces the same raw corpus", () => {
    expect(JSON.stringify(generateSeed().rawEvents)).toBe(JSON.stringify(generateSeed().rawEvents));
  });

  it("replaying the corpus twice yields identical normalized + graph checksums", () => {
    const { rawEvents } = generateSeed();
    const a = buildWorkspace(rawEvents);
    const b = buildWorkspace(rawEvents);
    expect(a.normalizedChecksum).toBe(b.normalizedChecksum);
    expect(a.checksum).toBe(b.checksum);
  });

  it("replaying every event a second time changes nothing (0 duplicate normalized events)", () => {
    const { rawEvents } = generateSeed();
    const once = buildWorkspace(rawEvents);
    const twice = buildWorkspace([...rawEvents, ...rawEvents]);
    expect(twice.resolved.length).toBe(once.resolved.length);
    expect(twice.checksum).toBe(once.checksum);
    expect(twice.normalizedChecksum).toBe(once.normalizedChecksum);
  });
});

describe("cross-engine determinism", () => {
  it("matches the golden checksum (also verified in Chromium; derived floats are quantized)", () => {
    const ws = buildWorkspace(generateSeed().rawEvents);
    expect(ws.checksum).toBe("0a49fde1791b53");
    for (const e of ws.graph.edges.values()) expect(Math.round(e.strength * 1e9) / 1e9).toBe(e.strength);
  });
});
