import type { Metadata } from "next";
import { JobsView } from "@/views/Jobs";

export const metadata: Metadata = { title: "Jobs & Health" };
export default function Page() {
  return <JobsView />;
}
