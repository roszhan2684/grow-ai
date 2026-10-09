/**
 * Server-side demo state for route handlers. Serverless instances do not share memory, so
 * webhook dedupe here is per-instance; production would back this with the raw_events table
 * (unique index on provider + provider_event_id — see supabase/migrations).
 */
import { generateSeed } from "@/core/seed/generate";
import { buildWorkspace } from "@/core/workspace";

export const DEMO_WEBHOOK_SECRET = process.env.GROW_WEBHOOK_SECRET ?? "whsec_demo_only_not_a_real_secret";

const g = globalThis as unknown as { __growSeen?: Set<string>; __growSigs?: Set<string>; __growWs?: ReturnType<typeof buildWorkspace> };
export const seenProviderIds = (g.__growSeen ??= new Set<string>());
export const seenSignatures = (g.__growSigs ??= new Set<string>());
export function serverWorkspace() {
  return (g.__growWs ??= buildWorkspace(generateSeed().rawEvents));
}
