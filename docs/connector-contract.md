# Connector contract

```ts
interface Connector {
  provider: Provider;
  mode: "live" | "mock" | "fixture";
  getAuthorizationUrl(ctx: { redirectUri; state; codeChallenge }): Promise<string>;
  exchangeCode(code, verifier): Promise<TokenSet>;
  refreshTokens(tokens): Promise<TokenSet>;
  sync(cursor?): AsyncIterable<SyncPage>;
  verifyWebhook(req, secret, now): Promise<VerifiedWebhook>;
  normalize(event): Promise<NormalizedEvent[]>;
  health(): Promise<ConnectorHealth>;
}
```

## States
`DISCONNECTED → CONNECTING → HEALTHY ⇄ DEGRADED → REAUTH_REQUIRED → DISCONNECTED`

## Required behaviors and where they live
| Behavior | Implementation | Proof |
| --- | --- | --- |
| OAuth state + PKCE (S256) | `createAuthorizationRequest`, `/api/integrations/[provider]/authorize` | unit test; verifier only in httpOnly cookie |
| Encrypted secrets, metadata separate | `encryptSecret/decryptSecret` (AES-GCM); `oauth_tokens.encrypted_token_ref` | round-trip test |
| Webhook signature verification | `verifySignedWebhook`: HMAC-SHA256(method+path+body+ts), constant-time compare | forged/tampered/stale tests + E2E |
| Replay protection | ±5 min tolerance + seen-signature set; dedupe on provider ID + payload hash | `duplicate_webhook` scenario |
| Cursor sync | `sync(cursor)`; cursor committed per page | `auth_revoked` resumes from cursor |
| Backoff + jitter | `backoffMs`: `min(30s, 500ms·2^(n−1)) + U(0,250ms)` | bounds test, `server_error` scenario |
| Retry-After | `retryable_failure.retryAfterMs` overrides backoff | `rate_limit` scenario |
| 401 handling | refresh once → retry; refresh failure → `REAUTH_REQUIRED` | `auth_expired`, `auth_revoked` |
| Dead letters + replay | `raw_events.status = dead_letter` + Data Quality repair & replay | demo + `partial_batch` |
| Reconciliation | provider count vs observed after resume | `auth_revoked` (drift → 0) |
| No provider payload leakage | normalizers are the only provider-aware code | code structure |
| Token redaction in logs | `redact()` on keys and token-shaped values | "logs never contain tokens" test |
