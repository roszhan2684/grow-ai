import type { Metadata } from "next";
import { WorkspaceProvider } from "@/lib/demo-store";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = { title: { default: "Demo workspace", template: "%s · GROW AI demo" } };

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceProvider>
      <AppShell>{children}</AppShell>
    </WorkspaceProvider>
  );
}
