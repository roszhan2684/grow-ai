import type { Metadata } from "next";
import { AttributionView } from "@/views/Attribution";

export const metadata: Metadata = { title: "Attribution" };
export default function Page() {
  return <AttributionView />;
}
