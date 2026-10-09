import bench from "../../benchmarks/results/latest.json";
import { generateSeed } from "@/core/seed/generate";
import { buildWorkspace } from "@/core/workspace";

export const GITHUB_URL = "https://github.com/roszhan2684/grow-ai";
export const BENCH = bench;

let cached: ReturnType<typeof buildWorkspace> | undefined;
/** Deterministic seed workspace used to render real engine output into the marketing pages at build time. */
export function siteWorkspace() {
  return (cached ??= buildWorkspace(generateSeed().rawEvents));
}
