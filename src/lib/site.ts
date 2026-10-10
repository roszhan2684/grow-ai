import { generateSeed } from "@/core/seed/generate";
import { buildWorkspace } from "@/core/workspace";

/** Where "Talk to sales" leads. Set NEXT_PUBLIC_SALES_EMAIL in the deployment to receive leads by email. */
export const SALES_EMAIL = process.env.NEXT_PUBLIC_SALES_EMAIL ?? "";

let cached: ReturnType<typeof buildWorkspace> | undefined;
/** The sample workspace, used to render real product components into the marketing pages at build time. */
export function siteWorkspace() {
  return (cached ??= buildWorkspace(generateSeed().rawEvents));
}
