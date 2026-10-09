/**
 * Coordinated executive content engine.
 * Pipeline: persona memory → campaign context → ANGLE BRIEFS (not posts) → overlap check →
 * independent drafts → factuality / duplication / forbidden-claim / style checks → human approval.
 *
 * Generation is deterministic (curated phrase banks composed per persona) so it is testable and
 * replayable. The LlmProvider interface in agents/llm.ts is the slot for a model-backed writer.
 */
import type { PersonaRole } from "../contracts";

export type ProofPoint = { id: string; text: string };

export type Campaign = {
  id: string;
  theme: string;
  audience: string;
  objective: string;
  proofPoints: ProofPoint[];
  forbiddenClaims: string[];
  targetAccounts: string[];
  personas: PersonaRole[];
  startsAt: string;
};

export type AngleBrief = {
  persona: PersonaRole;
  angle: "vision" | "field_insight" | "framework";
  hook: string;
  thesis: string;
  proofPointId: string;
  cta: string;
};

export type CheckResult = { name: string; passed: boolean; detail: string };

export type Draft = {
  id: string;
  campaignId: string;
  persona: PersonaRole;
  angle: AngleBrief["angle"];
  title: string;
  body: string;
  modelVersion: string;
  checks: CheckResult[];
  scheduledFor: string;
};

export const GENERATOR_VERSION = "phrasebank-v2";
export const OVERLAP_THRESHOLD = 0.3;

export const PERSONA_STRATEGY: Record<PersonaRole, { label: string; angle: AngleBrief["angle"]; description: string; lexicon: string[] }> = {
  ceo: { label: "CEO", angle: "vision", description: "Vision, market thesis, category point of view", lexicon: ["bet", "decade", "category", "next cycle", "board"] },
  vp_sales: { label: "VP Sales", angle: "field_insight", description: "Field insight, objections, customer pain, proof", lexicon: ["conversations", "field", "buyers", "objection", "pattern"] },
  head_marketing: { label: "Head of Marketing", angle: "framework", description: "Framework, data, educational breakdown, campaign narrative", lexicon: ["framework", "measure", "decide", "prove", "planning"] },
};

type Bank = {
  ceo: { hook: string; thesis: string; vision: string; bet: string };
  vp_sales: { hook: string; objections: [string, string, string]; pattern: string };
  head_marketing: { hook: string; steps: [string, string, string]; why: string };
  cta: Record<PersonaRole, string>;
  proofFor: Record<PersonaRole, string>;
};

const BANKS: Record<string, Bank> = {
  "Reliability as a revenue lever": {
    ceo: {
      hook: "Reliability stopped being an engineering metric the day it started showing up in renewal calls.",
      thesis: "Boards now ask about incident minutes the way they ask about churn, and for the same reason.",
      vision: "treat reliability as a product line with an owner, a roadmap and a P&L",
      bet: "within two planning cycles, the platform team that can price its own downtime gets the bigger budget.",
    },
    vp_sales: {
      hook: "Three conversations from the field this month.",
      objections: [
        "\"We can't justify another platform tool until the last incident review is closed.\"",
        "\"Our on-call rotation is the real bottleneck, not the tooling.\"",
        "\"Finance wants to know what an hour of downtime costs before we talk scope.\"",
      ],
      pattern: "buyers are not asking for features. They are asking for a number they can defend to finance.",
    },
    head_marketing: {
      hook: "A framework we use when reliability has to compete for budget:",
      steps: [
        "translate incident minutes into revenue at risk per service",
        "rank services by revenue at risk, not by alert volume",
        "report the delta every quarter in the same deck as pipeline",
      ],
      why: "it gives engineering and finance one shared unit, so the conversation stops being about opinions.",
    },
    cta: {
      ceo: "Curious who else is putting reliability on the board agenda.",
      vp_sales: "If you are hearing the same objections, I would like to compare notes.",
      head_marketing: "Save this for your next planning cycle.",
    },
    proofFor: { ceo: "pp_board", vp_sales: "pp_meetings", head_marketing: "pp_framework" },
  },
  "Cloud cost without the spreadsheet theater": {
    ceo: {
      hook: "Every cloud bill is a strategy document nobody reads.",
      thesis: "Cost per request is the only number that connects infrastructure decisions to gross margin.",
      vision: "make unit economics a design constraint, not a quarterly clean-up",
      bet: "the next generation of platform leaders will be hired for margin literacy as much as for uptime.",
    },
    vp_sales: {
      hook: "What buyers told us about cloud cost this quarter.",
      objections: [
        "\"We already have a FinOps dashboard; nobody acts on it.\"",
        "\"Savings plans locked us in before the workload changed.\"",
        "\"Egress is the line item nobody owns.\"",
      ],
      pattern: "the pain is ownership, not visibility. Dashboards without an owner become wallpaper.",
    },
    head_marketing: {
      hook: "A three-step model for cost conversations that engineers will sit through:",
      steps: ["pick one unit (cost per request, per tenant or per job)", "set a target per service owner", "review variance next to deploy frequency"],
      why: "pairing cost with delivery speed stops cost work from being read as a slowdown.",
    },
    cta: {
      ceo: "What unit does your team use for cloud economics?",
      vp_sales: "Tell me which of these you have heard. I am collecting patterns.",
      head_marketing: "Steal it, adapt it, tell us what broke.",
    },
    proofFor: { ceo: "pp_margin", vp_sales: "pp_meetings", head_marketing: "pp_framework" },
  },
};

export const CAMPAIGN_THEMES = Object.keys(BANKS);

export function defaultCampaigns(targetAccounts: string[], startsAt: string): Campaign[] {
  return [
    {
      id: "cmp_reliability_q4",
      theme: "Reliability as a revenue lever",
      audience: "VP Engineering and CTOs at warming target accounts",
      objective: "Turn reliability engagement into first meetings",
      proofPoints: [
        { id: "pp_board", text: "Reliability now shows up in renewal and board conversations, not only in postmortems." },
        { id: "pp_meetings", text: "In our recent customer meetings, the downtime-cost question came before pricing." },
        { id: "pp_framework", text: "Revenue at risk per service is a unit both engineering and finance can review." },
      ],
      forbiddenClaims: ["guaranteed", "100% uptime", "zero downtime", "best in class", "#1"],
      targetAccounts,
      personas: ["ceo", "vp_sales", "head_marketing"],
      startsAt,
    },
    {
      id: "cmp_cost_q4",
      theme: "Cloud cost without the spreadsheet theater",
      audience: "Platform and finance leaders at cost-sensitive accounts",
      objective: "Open conversations with accounts engaging on cost topics",
      proofPoints: [
        { id: "pp_margin", text: "Cost per request links infrastructure choices to gross margin." },
        { id: "pp_meetings", text: "Buyers describe cost ownership, not visibility, as the gap." },
        { id: "pp_framework", text: "Pairing cost variance with deploy frequency keeps the conversation constructive." },
      ],
      forbiddenClaims: ["guaranteed savings", "cut your bill in half", "best in class", "#1"],
      targetAccounts,
      personas: ["ceo", "vp_sales", "head_marketing"],
      startsAt,
    },
  ];
}

export function buildAngleBriefs(c: Campaign): AngleBrief[] {
  const bank = BANKS[c.theme];
  if (!bank) throw new Error(`No phrase bank for theme "${c.theme}"`);
  return c.personas.map((persona) => {
    const hook = persona === "ceo" ? bank.ceo.hook : persona === "vp_sales" ? bank.vp_sales.hook : bank.head_marketing.hook;
    const thesis = persona === "ceo" ? bank.ceo.thesis : persona === "vp_sales" ? bank.vp_sales.pattern : bank.head_marketing.why;
    return { persona, angle: PERSONA_STRATEGY[persona].angle, hook, thesis, proofPointId: bank.proofFor[persona], cta: bank.cta[persona] };
  });
}

function composeBody(c: Campaign, b: AngleBrief): string {
  const bank = BANKS[c.theme]!;
  const proof = c.proofPoints.find((p) => p.id === b.proofPointId)?.text ?? "";
  if (b.persona === "ceo") {
    return [bank.ceo.hook, `${bank.ceo.thesis}`, `The companies that win the next cycle will ${bank.ceo.vision}.`, proof, `My bet: ${bank.ceo.bet}`, b.cta].join("\n\n");
  }
  if (b.persona === "vp_sales") {
    const [o1, o2, o3] = bank.vp_sales.objections;
    return [bank.vp_sales.hook, `1. ${o1}\n2. ${o2}\n3. ${o3}`, `The pattern across these conversations: ${bank.vp_sales.pattern}`, proof, b.cta].join("\n\n");
  }
  const [s1, s2, s3] = bank.head_marketing.steps;
  return [bank.head_marketing.hook, `→ Measure: ${s1}\n→ Decide: ${s2}\n→ Prove: ${s3}`, `Why this framework works: ${bank.head_marketing.why}`, proof, b.cta].join("\n\n");
}

/* ───────────── Checks ───────────── */

const STOP = new Set("a an the and or but of to in on for with is are was were be been it its this that as at by from we our you your they their not no so if then than into about who what when how why do does did can will would should i my me us them there here just only also very more most".split(" "));

export function tokenVector(text: string) {
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));
  const v = new Map<string, number>();
  for (let i = 0; i < words.length; i++) {
    v.set(words[i]!, (v.get(words[i]!) ?? 0) + 1);
    if (i > 0) v.set(`${words[i - 1]} ${words[i]}`, (v.get(`${words[i - 1]} ${words[i]}`) ?? 0) + 1);
  }
  return v;
}

export function cosine(a: string, b: string) {
  const va = tokenVector(a);
  const vb = tokenVector(b);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const [k, x] of va) {
    na += x * x;
    const y = vb.get(k);
    if (y) dot += x * y;
  }
  for (const y of vb.values()) nb += y * y;
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

/** Text shared by the campaign (proof points, CTA boilerplate) is excluded from overlap scoring. */
const stripShared = (text: string, c: Campaign) => c.proofPoints.reduce((t, p) => t.replace(p.text, ""), text);

export function overlapMatrix(drafts: Pick<Draft, "persona" | "body">[], c: Campaign) {
  const out: { a: PersonaRole; b: PersonaRole; similarity: number }[] = [];
  for (let i = 0; i < drafts.length; i++)
    for (let j = i + 1; j < drafts.length; j++)
      out.push({ a: drafts[i]!.persona, b: drafts[j]!.persona, similarity: cosine(stripShared(drafts[i]!.body, c), stripShared(drafts[j]!.body, c)) });
  return out;
}

export function runChecks(body: string, persona: PersonaRole, c: Campaign, others: Pick<Draft, "persona" | "body">[]): CheckResult[] {
  const lower = body.toLowerCase();
  const forbidden = c.forbiddenClaims.filter((f) => lower.includes(f.toLowerCase()));
  const proofText = c.proofPoints.map((p) => p.text).join(" ");
  const numbers = (body.match(/\$?\d[\d,.]*%?x?/g) ?? []).filter((n) => !/^[123]\.$/.test(n));
  const unsupported = numbers.filter((n) => !proofText.includes(n.replace(/[.,]$/, "")));
  const maxOverlap = Math.max(0, ...others.filter((o) => o.persona !== persona).map((o) => cosine(stripShared(body, c), stripShared(o.body, c))));
  const lex = PERSONA_STRATEGY[persona].lexicon;
  const style = lex.filter((w) => lower.includes(w)).length / lex.length;
  return [
    { name: "Forbidden claims", passed: forbidden.length === 0, detail: forbidden.length ? `Contains: ${forbidden.map((f) => `"${f}"`).join(", ")}` : `None of ${c.forbiddenClaims.length} forbidden phrases present` },
    { name: "Unsupported numbers", passed: unsupported.length === 0, detail: unsupported.length ? `Not backed by a proof point: ${unsupported.join(", ")}` : "Every figure traces to a proof point" },
    { name: "Cross-persona overlap", passed: maxOverlap < OVERLAP_THRESHOLD, detail: `Max cosine similarity ${maxOverlap.toFixed(2)} (threshold ${OVERLAP_THRESHOLD})` },
    { name: "Persona style", passed: style >= 0.4, detail: `${Math.round(style * 100)}% of ${PERSONA_STRATEGY[persona].label} voice markers present` },
  ];
}

export function generateDrafts(c: Campaign): { briefs: AngleBrief[]; drafts: Draft[]; briefOverlap: ReturnType<typeof overlapMatrix> } {
  const briefs = buildAngleBriefs(c);
  const briefOverlap = overlapMatrix(briefs.map((b) => ({ persona: b.persona, body: `${b.hook} ${b.thesis}` })), c);
  const bodies = briefs.map((b) => ({ persona: b.persona, body: composeBody(c, b) }));
  const dayOffset: Record<PersonaRole, number> = { ceo: 1, vp_sales: 3, head_marketing: 4 };
  const drafts = briefs.map((b, i) => ({
    id: `drf_${c.id}_${b.persona}`,
    campaignId: c.id,
    persona: b.persona,
    angle: b.angle,
    title: b.hook.length > 72 ? `${b.hook.slice(0, 69)}…` : b.hook,
    body: bodies[i]!.body,
    modelVersion: GENERATOR_VERSION,
    checks: runChecks(bodies[i]!.body, b.persona, c, bodies),
    scheduledFor: new Date(Date.parse(c.startsAt) + dayOffset[b.persona] * 86_400_000).toISOString(),
  }));
  return { briefs, drafts, briefOverlap };
}
