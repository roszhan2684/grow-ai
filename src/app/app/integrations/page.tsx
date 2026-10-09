import type { Metadata } from "next";
import { IntegrationsView } from "@/views/Integrations";

export const metadata: Metadata = { title: "Integrations" };
export default function Page() {
  return <IntegrationsView />;
}
