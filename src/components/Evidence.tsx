"use client";

import { useDemo } from "@/lib/demo-store";
import { describeEvent } from "@/core/workspace";
import { formatDate } from "@/core/lib/time";
import { Badge, Mono } from "./ui";

/** Every score links back to raw normalized events. This is that link. */
export function EvidenceList({ ids, max = 12 }: { ids: string[]; max?: number }) {
  const { ws } = useDemo();
  const events = ids.map((id) => ws.eventById.get(id)).filter(Boolean).sort((a, b) => (a!.occurredAt < b!.occurredAt ? 1 : -1));
  if (!events.length) return <p className="px-1 py-2 text-xs text-muted">No event evidence (structural or system signal).</p>;
  return (
    <ul className="divide-y divide-line">
      {events.slice(0, max).map((e) => {
        const d = describeEvent(ws, e!);
        const raw = ws.rawById.get(e!.rawEventId);
        return (
          <li key={e!.id} className="py-2">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[12.5px] text-ink">{d.title}</p>
              <span className="tnum shrink-0 font-mono text-[11px] text-muted">{formatDate(e!.occurredAt)}</span>
            </div>
            {d.detail && <p className="mt-0.5 line-clamp-2 text-[11.5px] text-muted">“{d.detail}”</p>}
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <Badge mono>{e!.source}</Badge>
              <Mono className="text-muted">{e!.id}</Mono>
              <Mono className="text-subtle">← {raw?.providerEventId}</Mono>
              {e!.identityConfidence < 1 && <Badge tone={e!.identityConfidence < 0.5 ? "danger" : "warning"}>identity {e!.identityConfidence.toFixed(2)}</Badge>}
              {e!.metadata.untrusted === true && <Badge tone="neutral">untrusted text</Badge>}
            </div>
          </li>
        );
      })}
      {events.length > max && <li className="py-2 text-[11px] text-muted">+ {events.length - max} more</li>}
    </ul>
  );
}
