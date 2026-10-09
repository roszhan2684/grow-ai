"use client";

import { useMemo } from "react";
import { BreakIt } from "@/components/BreakIt";
import { generateSeed } from "@/core/seed/generate";

export function BreakItSection() {
  const seed = useMemo(() => generateSeed().rawEvents, []);
  return <BreakIt seed={seed} />;
}
