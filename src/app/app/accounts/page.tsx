import type { Metadata } from "next";
import { AccountsView } from "@/views/Accounts";

export const metadata: Metadata = { title: "Accounts" };
export default function Page() {
  return <AccountsView />;
}
