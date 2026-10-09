import type { Metadata } from "next";
import { GraphExplorerView } from "@/views/GraphExplorer";

export const metadata: Metadata = { title: "Graph explorer" };
export default function Page() {
  return <GraphExplorerView />;
}
