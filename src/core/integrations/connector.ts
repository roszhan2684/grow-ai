/**
 * Connector SDK. Every provider implements this contract; provider payloads never leave the
 * connector (normalize() is the boundary). Security primitives use WebCrypto so the same code
 * runs in route handlers, workers and tests.
 */
import type { NormalizedEvent, Provider, RawEvent, StoredRawEvent } from "../contracts";
import { normalizeRaw } from "./normalize";

export type ConnectorStatus = "DISCONNECTED" | "CONNECTING" | "HEALTHY" | "DEGRADED" | "REAUTH_REQUIRED";

export type TokenSet = { accessTokenRef: string; refreshTokenRef?: string; expiresAt: string; scopes: string[] };
export type VerifiedWebhook = { ok: true; events: RawEvent[] } | { ok: false; reason: string };
export type ConnectorHealth = { status: ConnectorStatus; lagSeconds: number; lastError?: string };
export type SyncPage = { events: RawEvent[]; nextCursor?: string };

export interface Connector {
  provider: Provider;
  displayName: string;
  /** "live" = real OAuth/API path wired; "mock" = realistic contract with fake upstream; "fixture" = replayed recordings. */
  mode: "live" | "mock" | "fixture";
  scopes: string[];
  getAuthorizationUrl(ctx: { redirectUri: string; state: string; codeChallenge: string }): Promise<string>;
  exchangeCode(code: string, verifier: string): Promise<TokenSet>;
  refreshTokens(tokens: TokenSet): Promise<TokenSet>;
  sync(cursor?: string): AsyncIterable<SyncPage>;
  verifyWebhook(req: { headers: Record<string, string | undefined>; body: string; method: string; url: string }, secret: string, now: number): Promise<VerifiedWebhook>;
  normalize(event: StoredRawEvent): Promise<NormalizedEvent[]>;
  health(): Promise<ConnectorHealth>;
}

/* ───────────── OAuth: state + PKCE (RFC 7636, S256) ───────────── */

const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export function randomToken(bytes = 32) {
  const b = new Uint8Array(bytes);
  crypto.getRandomValues(b);
  return b64url(b);
}

export async function pkceChallenge(verifier: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return b64url(new Uint8Array(digest));
}

export async function createAuthorizationRequest(connector: Connector, redirectUri: string) {
  const state = randomToken(16);
  const verifier = randomToken(32);
  const codeChallenge = await pkceChallenge(verifier);
  const url = await connector.getAuthorizationUrl({ redirectUri, state, codeChallenge });
  // state + verifier are stored server-side (short TTL) and compared on callback; never sent to the client.
  return { url, state, verifier };
}

/* ───────────── Webhooks: HMAC-SHA256 + timestamp tolerance + replay protection ───────────── */

export const WEBHOOK_TOLERANCE_MS = 5 * 60_000;

async function hmacBase64(secret: string, message: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Signature base = METHOD + URL + BODY + TIMESTAMP (same shape as HubSpot's v3 scheme). */
export async function signWebhook(secret: string, method: string, url: string, body: string, timestamp: number) {
  return hmacBase64(secret, `${method}${url}${body}${timestamp}`);
}

export async function verifySignedWebhook(
  req: { headers: Record<string, string | undefined>; body: string; method: string; url: string },
  secret: string,
  now: number,
  seenSignatures?: Set<string>,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const sig = req.headers["x-grow-signature"];
  const ts = Number(req.headers["x-grow-timestamp"]);
  if (!sig || !Number.isFinite(ts)) return { ok: false, reason: "missing signature or timestamp header" };
  if (Math.abs(now - ts) > WEBHOOK_TOLERANCE_MS) return { ok: false, reason: "timestamp outside 5 minute tolerance" };
  const expected = await signWebhook(secret, req.method, req.url, req.body, ts);
  if (!timingSafeEqual(expected, sig)) return { ok: false, reason: "signature mismatch" };
  if (seenSignatures) {
    if (seenSignatures.has(sig)) return { ok: false, reason: "replayed signature" };
    seenSignatures.add(sig);
  }
  return { ok: true };
}

/* ───────────── Token storage: AES-GCM ciphertext stored apart from metadata ───────────── */

async function aesKey(secret: string) {
  const raw = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export async function encryptSecret(plaintext: string, secret: string) {
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await aesKey(secret), new TextEncoder().encode(plaintext));
  return `v1.${b64url(iv)}.${btoa(String.fromCharCode(...new Uint8Array(ct)))}`;
}

export async function decryptSecret(blob: string, secret: string) {
  const [v, ivPart, ctPart] = blob.split(".");
  if (v !== "v1" || !ivPart || !ctPart) throw new Error("unknown secret format");
  const iv = Uint8Array.from(atob(ivPart.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
  const ct = Uint8Array.from(atob(ctPart), (c) => c.charCodeAt(0));
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, await aesKey(secret), ct);
  return new TextDecoder().decode(pt);
}

/* ───────────── Provider definitions ───────────── */

function fixtureConnector(provider: Provider, displayName: string, mode: Connector["mode"], scopes: string[], authBase: string, pages: () => SyncPage[]): Connector {
  return {
    provider,
    displayName,
    mode,
    scopes,
    async getAuthorizationUrl({ redirectUri, state, codeChallenge }) {
      const u = new URL(authBase);
      u.searchParams.set("redirect_uri", redirectUri);
      u.searchParams.set("scope", scopes.join(" "));
      u.searchParams.set("state", state);
      u.searchParams.set("code_challenge", codeChallenge);
      u.searchParams.set("code_challenge_method", "S256");
      return u.toString();
    },
    async exchangeCode() {
      return { accessTokenRef: `secret://${provider}/access`, refreshTokenRef: `secret://${provider}/refresh`, expiresAt: new Date(Date.UTC(2026, 9, 1, 16)).toISOString(), scopes };
    },
    async refreshTokens(t) {
      return { ...t, expiresAt: new Date(Date.parse(t.expiresAt) + 3_600_000).toISOString() };
    },
    async *sync(cursor) {
      const all = pages();
      const start = cursor ? Number(cursor) : 0;
      for (let i = start; i < all.length; i++) yield { ...all[i]!, nextCursor: String(i + 1) };
    },
    async verifyWebhook(req, secret, now) {
      const v = await verifySignedWebhook(req, secret, now);
      if (!v.ok) return v;
      try {
        const parsed = JSON.parse(req.body) as RawEvent | RawEvent[];
        return { ok: true, events: Array.isArray(parsed) ? parsed : [parsed] };
      } catch {
        return { ok: false, reason: "body is not valid JSON" };
      }
    },
    async normalize(e) {
      return normalizeRaw(e);
    },
    async health() {
      return { status: "HEALTHY", lagSeconds: 0 };
    },
  };
}

export function createConnectors(seedEvents: readonly RawEvent[]) {
  const pagesFor = (p: Provider) => () => {
    const evs = seedEvents.filter((e) => e.provider === p);
    const pages: SyncPage[] = [];
    for (let i = 0; i < evs.length; i += 25) pages.push({ events: evs.slice(i, i + 25) });
    return pages;
  };
  return {
    csv_crm: fixtureConnector("csv_crm", "CSV CRM import", "live", [], "https://grow-ai.local/csv", () => []),
    hubspot: fixtureConnector("hubspot", "HubSpot (mock)", "mock", ["crm.objects.deals.read", "crm.objects.contacts.read"], "https://app.hubspot.com/oauth/authorize", pagesFor("hubspot")),
    slack: fixtureConnector("slack", "Slack (fixture)", "fixture", ["channels:history", "channels:read"], "https://slack.com/oauth/v2/authorize", pagesFor("slack")),
    social: fixtureConnector("social", "Social engagement (fixture)", "fixture", [], "https://grow-ai.local/social", pagesFor("social")),
  } satisfies Partial<Record<Provider, Connector>>;
}
