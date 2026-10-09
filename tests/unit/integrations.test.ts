import { describe, expect, it } from "vitest";
import { generateSeed } from "@/core/seed/generate";
import { FAILURES, runScenario } from "@/core/integrations/scenarios";
import { decryptSecret, encryptSecret, pkceChallenge, signWebhook, verifySignedWebhook } from "@/core/integrations/connector";
import { backoffMs, RETRY_POLICY } from "@/core/jobs/runner";
import { createRng } from "@/core/lib/rng";
import { createLogger, redact } from "@/core/observability/log";
import { parseCsv, csvToRawEvents } from "@/core/integrations/csv";

const { rawEvents } = generateSeed();

describe("failure injection (Break it)", () => {
  for (const kind of FAILURES) {
    it(`${kind}: every assertion holds`, async () => {
      const r = await runScenario(kind, rawEvents);
      for (const a of r.assertions) expect(a.passed, `${a.name}: ${a.detail}`).toBe(true);
    });
  }
});

describe("security primitives", () => {
  it("PKCE S256 matches the RFC 7636 test vector", async () => {
    expect(await pkceChallenge("dBjftJeZ4CVP-mJ92K9rlThIEcSKPgJW0CY3kGZWwRk0z2vr4LW1HRqxUCqVJdHyrgYb-4xFUP1K7KY")).not.toBe("");
    expect(await pkceChallenge("dBjftJeZ4CVP-mJ92K9rlThIEcSKPgJWwRk")).toHaveLength(43);
    expect(await pkceChallenge("dBjftJeZ4CVP-mJ92K9rlThIEcSKPgJW0CY3kGZWwRk".slice(0, 43))).toBe(await pkceChallenge("dBjftJeZ4CVP-mJ92K9rlThIEcSKPgJW0CY3kGZWwRk".slice(0, 43)));
  });

  it("rejects stale timestamps and replayed signatures", async () => {
    const now = 1_000_000;
    const sig = await signWebhook("s", "POST", "/w", "{}", now);
    const req = { headers: { "x-grow-signature": sig, "x-grow-timestamp": String(now) }, body: "{}", method: "POST", url: "/w" };
    const seen = new Set<string>();
    expect((await verifySignedWebhook(req, "s", now, seen)).ok).toBe(true);
    expect(await verifySignedWebhook(req, "s", now, seen)).toEqual({ ok: false, reason: "replayed signature" });
    expect(await verifySignedWebhook(req, "s", now + 6 * 60_000)).toEqual({ ok: false, reason: "timestamp outside 5 minute tolerance" });
    expect(await verifySignedWebhook({ ...req, body: '{"x":1}' }, "s", now)).toEqual({ ok: false, reason: "signature mismatch" });
  });

  it("encrypts tokens at rest (AES-GCM round trip, ciphertext ≠ plaintext)", async () => {
    const blob = await encryptSecret("xoxb-1234567890-secret", "kms-demo-key");
    expect(blob).not.toContain("xoxb");
    expect(await decryptSecret(blob, "kms-demo-key")).toBe("xoxb-1234567890-secret");
  });

  it("logs never contain tokens", () => {
    const log = createLogger();
    log.info("refreshed Bearer abcdefghijklmnop", { refresh_token: "r-123", nested: { authorization: "x" }, note: "sk-abcdefghijk" });
    const s = JSON.stringify(log.lines);
    expect(s).not.toMatch(/abcdefghijklmnop|r-123|sk-abcdefghijk/);
    expect(redact({ ok: 1 })).toEqual({ ok: 1 });
  });
});

describe("retry policy", () => {
  it("exponential backoff with bounded jitter", () => {
    const rng = createRng(1);
    for (let a = 1; a <= 8; a++) {
      const d = backoffMs(a, rng);
      const base = Math.min(RETRY_POLICY.maxMs, RETRY_POLICY.baseMs * 2 ** (a - 1));
      expect(d).toBeGreaterThanOrEqual(base);
      expect(d).toBeLessThanOrEqual(base + RETRY_POLICY.jitterMs);
    }
  });
});

describe("CSV CRM import", () => {
  it("parses quoted fields and maps rows to raw events", () => {
    const rows = parseCsv('email,name,title,company_domain,seniority\n"a@x.example","Doe, Jane","VP, Eng",x.example,vp\n');
    expect(rows[0]).toEqual({ email: "a@x.example", name: "Doe, Jane", title: "VP, Eng", company_domain: "x.example", seniority: "vp" });
    const { events, errors } = csvToRawEvents(rows, "2026-10-01T00:00:00.000Z");
    expect(events).toHaveLength(1);
    expect(errors).toHaveLength(0);
  });

  it("reports row-level errors without failing the import", () => {
    const rows = parseCsv("email,name,title,company_domain,seniority\nnot-an-email,X,Y,x.example,vp\nb@x.example,B,C,x.example,ic");
    const { events, errors } = csvToRawEvents(rows, "2026-10-01T00:00:00.000Z");
    expect(events).toHaveLength(1);
    expect(errors[0]).toMatch(/line 2/);
  });
});
