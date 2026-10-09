import type { Metadata } from "next";
import { SettingsView } from "@/views/Settings";

export const metadata: Metadata = { title: "Settings" };
export default function Page() {
  return <SettingsView />;
}
