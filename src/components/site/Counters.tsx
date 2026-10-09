"use client";

import NumberFlow from "@number-flow/react";
import { useEffect, useRef, useState } from "react";

/** Count-up proof counters. Values arrive from the benchmark artifact; this only animates them. */
export function Counters({ items }: { items: { value: number; label: string; suffix?: string; prefix?: string }[] }) {
  const ref = useRef<HTMLDListElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e?.isIntersecting && setSeen(true), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <dl ref={ref} className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3 lg:grid-cols-6">
      {items.map((i) => (
        <div key={i.label} className="bg-surface px-4 py-5">
          <dd className="tnum font-display text-3xl font-semibold text-ink">
            {i.prefix}
            <NumberFlow value={seen ? i.value : 0} />
            {i.suffix}
          </dd>
          <dt className="mt-1 text-[12px] leading-snug text-muted">{i.label}</dt>
        </div>
      ))}
    </dl>
  );
}
