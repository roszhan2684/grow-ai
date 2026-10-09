import { notFound } from "next/navigation";
import { AccountView } from "@/views/Account";
import { COMPANIES } from "@/core/seed/universe";
import { companyIdForDomain } from "@/core/identity/resolve";

const IDS = COMPANIES.filter((c) => c.isTarget).map((c) => companyIdForDomain(c.domain));

export function generateStaticParams() {
  return IDS.map((id) => ({ id }));
}

export async function generateMetadata({ params }: PageProps<"/app/accounts/[id]">) {
  const { id } = await params;
  return { title: COMPANIES.find((c) => companyIdForDomain(c.domain) === id)?.name ?? "Account" };
}

export default async function Page({ params }: PageProps<"/app/accounts/[id]">) {
  const { id } = await params;
  if (!IDS.includes(id)) notFound();
  return <AccountView id={id} />;
}
