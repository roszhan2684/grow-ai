/**
 * Agent tool registry. Every tool returns typed, evidence-linked results.
 * Policy is a static property of the TOOL — never of the prompt or of anything a tool returns —
 * so injected text cannot talk the agent into a side effect.
 */
import { z } from "zod";
import type { Workspace } from "../workspace";
import { accountTimeline, companyName, personName } from "../workspace";
import { MODELS } from "../attribution/models";
import { PERSONA_STRATEGY, overlapMatrix } from "../content/engine";
import { hashString } from "../lib/hash";

export type Policy = "ALLOW" | "REQUIRE_APPROVAL" | "DENY";

export type ToolResult = { summary: string; data: unknown; evidence: string[]; untrustedText?: string[] };

export type ToolDef<I extends z.ZodType = z.ZodType> = {
  name: string;
  description: string;
  policy: Policy;
  sideEffect: boolean;
  input: I;
  run: (ws: Workspace, input: z.infer<I>) => ToolResult;
};

const companyId = z.string().regex(/^co_/);

const tool = <I extends z.ZodType>(t: ToolDef<I>) => t;

export const TOOLS = {
  search_graph: tool({
    name: "search_graph",
    description: "Find people, companies, posts or topics by name.",
    policy: "ALLOW",
    sideEffect: false,
    input: z.object({ query: z.string().min(1) }),
    run: (ws, { query }) => {
      const q = query.toLowerCase();
      const hits = [...ws.graph.nodes.values()].filter((n) => n.name.toLowerCase().includes(q)).slice(0, 8);
      return { summary: `${hits.length} node(s) match "${query}"`, data: hits.map((h) => ({ id: h.id, label: h.label, name: h.name })), evidence: [] };
    },
  }),
  get_account_timeline: tool({
    name: "get_account_timeline",
    description: "Recent interactions with an account, newest first.",
    policy: "ALLOW",
    sideEffect: false,
    input: z.object({ companyId, limit: z.number().int().positive().max(50).default(12) }),
    run: (ws, { companyId, limit }) => {
      const items = accountTimeline(ws, companyId).slice(0, limit);
      return {
        summary: `${items.length} recent events for ${companyName(ws, companyId)}`,
        data: items.map((i) => ({ id: i.event.id, date: i.date, title: i.title })),
        evidence: items.map((i) => i.event.id),
        // Ingested free text is returned SEPARATELY and marked untrusted. The runtime never plans from it.
        untrustedText: items.filter((i) => i.event.metadata.untrusted).map((i) => String(i.event.metadata.text)),
      };
    },
  }),
  get_people_at_company: tool({
    name: "get_people_at_company",
    description: "Stakeholders at an account with seniority and recent engagement.",
    policy: "ALLOW",
    sideEffect: false,
    input: z.object({ companyId }),
    run: (ws, { companyId }) => {
      const acct = ws.accounts.find((a) => a.company.id === companyId);
      const people = (acct?.people ?? []).map((p) => ({ id: p.id, name: p.name, title: p.title, seniority: p.seniority, touches30d: ws.resolved.filter((e) => e.actorId === p.id && Date.parse(e.occurredAt) > ws.now - 30 * 86_400_000).length }));
      return { summary: `${people.length} people at ${companyName(ws, companyId)}`, data: people, evidence: [] };
    },
  }),
  find_warm_paths: tool({
    name: "find_warm_paths",
    description: "Ranked team→target relationship paths (≤3 hops) with score components.",
    policy: "ALLOW",
    sideEffect: false,
    input: z.object({ companyId, limit: z.number().int().positive().max(10).default(3) }),
    run: (ws, { companyId, limit }) => {
      const paths = (ws.warmPaths.get(companyId) ?? []).slice(0, limit);
      return {
        summary: paths.length ? `Best path ${paths[0]!.nodeIds.map((id) => personName(ws, id)).join(" → ")} (score ${paths[0]!.score.toFixed(2)})` : "No warm path within 3 hops",
        data: paths.map((p) => ({ id: p.id, path: p.nodeIds.map((id) => personName(ws, id)), score: p.score, components: p.components })),
        evidence: paths.flatMap((p) => p.evidence),
      };
    },
  }),
  get_campaign_context: tool({
    name: "get_campaign_context",
    description: "Active campaign theme, target accounts and proof points.",
    policy: "ALLOW",
    sideEffect: false,
    input: z.object({ campaignId: z.string().optional() }),
    run: (ws, { campaignId }) => {
      const c = ws.campaigns.find((x) => x.id === campaignId) ?? ws.campaigns[0]!;
      return { summary: `Campaign "${c.theme}" targeting ${c.targetAccounts.length} accounts`, data: { id: c.id, theme: c.theme, objective: c.objective, targetAccounts: c.targetAccounts.map((id) => companyName(ws, id)) }, evidence: [] };
    },
  }),
  retrieve_persona_memory: tool({
    name: "retrieve_persona_memory",
    description: "Recent posts and topics for an executive persona.",
    policy: "ALLOW",
    sideEffect: false,
    input: z.object({ persona: z.enum(["ceo", "vp_sales", "head_marketing"]) }),
    run: (ws, { persona }) => {
      const person = [...ws.directory.people.values()].find((p) => p.personaRole === persona);
      const posts = ws.posts.filter((p) => p.authorId === person?.id).slice(-5);
      return { summary: `${posts.length} recent ${PERSONA_STRATEGY[persona].label} posts`, data: posts.map((p) => ({ id: p.id, title: p.title, topic: p.topic })), evidence: [] };
    },
  }),
  create_content_draft: tool({
    name: "create_content_draft",
    description: "Create an internal draft (not published). Drafts always go through human approval before scheduling.",
    policy: "ALLOW",
    sideEffect: false,
    input: z.object({ campaignId: z.string(), persona: z.enum(["ceo", "vp_sales", "head_marketing"]) }),
    run: (ws, { campaignId, persona }) => {
      const d = ws.campaignDrafts.get(campaignId)?.drafts.find((x) => x.persona === persona);
      return { summary: d ? `Draft ${d.id}: "${d.title}" (${d.checks.filter((c) => c.passed).length}/${d.checks.length} checks pass)` : "No draft", data: d ? { id: d.id, title: d.title, checks: d.checks } : null, evidence: [] };
    },
  }),
  score_content_overlap: tool({
    name: "score_content_overlap",
    description: "Pairwise semantic overlap between persona drafts in a campaign.",
    policy: "ALLOW",
    sideEffect: false,
    input: z.object({ campaignId: z.string() }),
    run: (ws, { campaignId }) => {
      const c = ws.campaigns.find((x) => x.id === campaignId)!;
      const m = overlapMatrix(ws.campaignDrafts.get(campaignId)?.drafts ?? [], c);
      return { summary: `Max overlap ${Math.max(...m.map((x) => x.similarity)).toFixed(2)}`, data: m, evidence: [] };
    },
  }),
  get_opportunity: tool({
    name: "get_opportunity",
    description: "Current CRM opportunity for an account.",
    policy: "ALLOW",
    sideEffect: false,
    input: z.object({ companyId }),
    run: (ws, { companyId }) => {
      const o = ws.accounts.find((a) => a.company.id === companyId)?.opportunity;
      return { summary: o ? `${o.name}: ${o.stage.replace("_", " ")}, $${o.amount.toLocaleString("en-US")} (synthetic)` : "No opportunity", data: o ?? null, evidence: [] };
    },
  }),
  compute_attribution: tool({
    name: "compute_attribution",
    description: "Weighted touches for an opportunity under a named model.",
    policy: "ALLOW",
    sideEffect: false,
    input: z.object({ opportunityId: z.string(), model: z.enum(MODELS) }),
    run: (ws, { opportunityId, model }) => {
      const opp = ws.opportunities.find((o) => o.id === opportunityId);
      if (!opp) return { summary: "Unknown opportunity", data: null, evidence: [] };
      const r = ws.attributionFor(opp, model);
      const top = [...r.touches].sort((a, b) => b.weight - a.weight).slice(0, 3);
      return { summary: `${model}: top touch "${top[0]?.label}" (${((top[0]?.weight ?? 0) * 100).toFixed(0)}%)`, data: { top: top.map((t) => ({ label: t.label, weight: t.weight })), confidence: r.confidence }, evidence: top.map((t) => t.eventId) };
    },
  }),
  create_crm_note: tool({
    name: "create_crm_note",
    description: "Write a note to the CRM contact record. External side effect.",
    policy: "REQUIRE_APPROVAL",
    sideEffect: true,
    input: z.object({ contactId: z.string(), body: z.string().min(1).max(2000) }),
    run: (ws, { contactId, body }) => ({ summary: `CRM note on ${personName(ws, contactId)}`, data: { contactId, body }, evidence: [] }),
  }),
  schedule_draft: tool({
    name: "schedule_draft",
    description: "Schedule an approved draft for publishing. External side effect.",
    policy: "REQUIRE_APPROVAL",
    sideEffect: true,
    input: z.object({ draftId: z.string() }),
    run: (_ws, { draftId }) => ({ summary: `Schedule ${draftId}`, data: { draftId }, evidence: [] }),
  }),
  request_approval: tool({
    name: "request_approval",
    description: "Ask a human to approve a pending side effect.",
    policy: "ALLOW",
    sideEffect: false,
    input: z.object({ action: z.string(), reason: z.string() }),
    run: (_ws, { action, reason }) => ({ summary: `Approval requested for ${action}`, data: { action, reason }, evidence: [] }),
  }),
  send_message: tool({
    name: "send_message",
    description: "Send an outbound message to a contact. External side effect.",
    policy: "REQUIRE_APPROVAL",
    sideEffect: true,
    input: z.object({ contactId: z.string(), body: z.string() }),
    run: (ws, { contactId }) => ({ summary: `Message to ${personName(ws, contactId)}`, data: null, evidence: [] }),
  }),
  delete_integration: tool({
    name: "delete_integration",
    description: "Disconnect and delete an integration.",
    policy: "DENY",
    sideEffect: true,
    input: z.object({ provider: z.string() }),
    run: () => ({ summary: "unreachable", data: null, evidence: [] }),
  }),
} as const;

export type ToolName = keyof typeof TOOLS;
export const REGISTRY_TOOLS = Object.keys(TOOLS).filter((t) => t !== "send_message" && t !== "delete_integration") as ToolName[];

export const idempotencyKeyFor = (tool: string, input: unknown) => `${tool}:${hashString(JSON.stringify(input))}`;

/** Instruction-shaped text inside ingested content. Flagged and ignored, never executed. */
export const INJECTION_PATTERN = /(ignore (all |your |previous )?(instructions|policy|rules)|system note|send (a )?message|you are now|disregard)/i;
