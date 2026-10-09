import type { Metadata } from "next";
import { Suspense } from "react";
import { AgentView } from "@/views/Agent";

export const metadata: Metadata = { title: "Agent" };
export default function Page() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading agent…</p>}>
      <AgentView />
    </Suspense>
  );
}
