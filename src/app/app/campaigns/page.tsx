import type { Metadata } from "next";
import { CampaignsView } from "@/views/Campaigns";

export const metadata: Metadata = { title: "Campaigns" };
export default function Page() {
  return <CampaignsView />;
}
