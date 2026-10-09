import type { Metadata } from "next";
import { DataQualityView } from "@/views/DataQuality";

export const metadata: Metadata = { title: "Data quality" };
export default function Page() {
  return <DataQualityView />;
}
