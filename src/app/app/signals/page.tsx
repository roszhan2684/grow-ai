import type { Metadata } from "next";
import { SignalsView } from "@/views/Signals";

export const metadata: Metadata = { title: "Signals" };
export default function Page() {
  return <SignalsView />;
}
