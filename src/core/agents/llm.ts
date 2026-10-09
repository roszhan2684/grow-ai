/**
 * LLM provider adapter. The shipped provider is deterministic (template-based) so the demo, tests
 * and evals are reproducible and cost $0. A model-backed provider implements the same interface;
 * it only ever phrases the summary — it never chooses tools or bypasses policy.
 */
export type SummaryFacts = { intent: string; company: string; plan: string; recs: string[]; pending: number };

export interface LlmProvider {
  name: string;
  summarize(facts: SummaryFacts): Promise<string>;
}

export const deterministicProvider: LlmProvider = {
  name: "deterministic-template",
  async summarize(f) {
    if (f.intent === "admin") return "That action is outside what the agent is allowed to do. Nothing was changed.";
    const lead = f.recs[0] ? `Top recommendation for ${f.company}: ${f.recs[0]}.` : `No grounded recommendation for ${f.company} yet.`;
    const more = f.recs.length > 1 ? ` ${f.recs.length - 1} more step${f.recs.length > 2 ? "s" : ""} below, each linked to its evidence.` : "";
    const gate = f.pending ? ` ${f.pending} action${f.pending > 1 ? "s" : ""} need${f.pending > 1 ? "" : "s"} your approval before anything leaves the system.` : "";
    return `${lead}${more}${gate}`;
  },
};

/** Failure-injection wrapper: the first `failures` calls time out. */
export function flakyProvider(inner: LlmProvider, failures: number): LlmProvider {
  let calls = 0;
  return {
    name: `${inner.name}+timeout-injection`,
    async summarize(f) {
      calls++;
      if (calls <= failures) throw new Error("LLM request timed out after 20000ms");
      return inner.summarize(f);
    },
  };
}
