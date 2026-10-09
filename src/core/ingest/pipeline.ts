/**
 * Event backbone: raw → stored (deduped) → normalized.
 * Append-only. Dedup key = provider + providerEventId; a repeat with the same payload hash is a
 * duplicate delivery and is recorded but never re-normalized.
 */
import type { NormalizedEvent, RawEvent, StoredRawEvent } from "../contracts";
import { hashPayload, hashString } from "../lib/hash";
import { NormalizationError, normalizeRaw } from "../integrations/normalize";

export type IngestResult = {
  raw: StoredRawEvent[];
  normalized: NormalizedEvent[];
  stats: { received: number; normalized: number; duplicates: number; deadLetters: number; conflicts: number };
};

export const rawEventId = (e: Pick<RawEvent, "provider" | "providerEventId">) => `raw_${hashString(`${e.provider}:${e.providerEventId}`)}`;

export function ingest(events: readonly RawEvent[], opts: { skip?: (e: StoredRawEvent) => boolean } = {}): IngestResult {
  const seen = new Map<string, StoredRawEvent>();
  const raw: StoredRawEvent[] = [];
  const normalized: NormalizedEvent[] = [];
  const stats = { received: 0, normalized: 0, duplicates: 0, deadLetters: 0, conflicts: 0 };

  for (const e of events) {
    stats.received++;
    const id = rawEventId(e);
    const hash = hashPayload(e.payload);
    const prior = seen.get(id);
    if (prior) {
      // Same delivery replayed → duplicate. Different payload under a stable ID → conflict, first write wins.
      const status = "duplicate" as const;
      if (prior.hash !== hash) stats.conflicts++;
      else stats.duplicates++;
      raw.push({ ...e, id: `${id}#${stats.received}`, hash, status, duplicateOf: id, error: prior.hash !== hash ? "payload conflict: provider re-used an event ID with a different payload" : undefined });
      continue;
    }
    const stored: StoredRawEvent = { ...e, id, hash, status: "received" };
    seen.set(id, stored);
    if (opts.skip?.(stored)) {
      raw.push(stored);
      continue;
    }
    try {
      const out = normalizeRaw(stored);
      stored.status = "normalized";
      normalized.push(...out);
      stats.normalized++;
    } catch (err) {
      stored.status = "dead_letter";
      stored.error = err instanceof NormalizationError ? err.message : `unexpected: ${String(err)}`;
      stats.deadLetters++;
    }
    raw.push(stored);
  }

  normalized.sort((a, b) => (a.occurredAt === b.occurredAt ? (a.id < b.id ? -1 : 1) : a.occurredAt < b.occurredAt ? -1 : 1));
  return { raw, normalized, stats };
}
