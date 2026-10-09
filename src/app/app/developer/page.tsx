import type { Metadata } from "next";
import { readdirSync } from "node:fs";
import path from "node:path";
import { DeveloperView } from "@/views/Developer";

export const metadata: Metadata = { title: "Developer" };

export default function Page() {
  let migrations: string[] = [];
  try {
    migrations = readdirSync(path.join(process.cwd(), "supabase/migrations")).filter((f) => f.endsWith(".sql")).sort();
  } catch {
    migrations = ["(migrations not bundled in this deployment)"];
  }
  const commit = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? process.env.NEXT_PUBLIC_COMMIT ?? "local";
  const env = process.env.VERCEL_ENV ? `vercel/${process.env.VERCEL_ENV}` : "local";
  return <DeveloperView migrations={migrations} commit={commit} env={env} />;
}
