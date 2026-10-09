/**
 * Agent runtime: plan from the USER's request only → call tools through the policy gate →
 * compose a grounded answer whose every recommendation cites evidence event IDs.
 *
 * The trace exposes what the system did (tools, inputs, outputs, evidence, timing, approvals) —
 * a concise reasoning summary, not hidden chain-of-thought.
 */
import type { Workspace } from "../workspace";
import { companyName, personName } from "../workspace";
import { INJECTION_PATTERN, TOOLS, idempotencyKeyFor, type Policy, type ToolName } from "./tools";
import { deterministicProvider, type LlmProvider } from "./llm";
import { hashString } from "../lib/hash";

export type Intent = "next_best_action" | "warm_path" | "content_plan" | "attribution" | "outbound" | "admin" | "account_summary";

export type TraceStep = {
  tool: ToolName;
  policy: Policy;
  input: unknown;
  status: "ok" | "approval_required" | "denied" | "error";
  summary: string;
  evidence: string[];
  durationMs: number;
};

export type PendingAction = { approvalId: string; tool: ToolName; input: Record<string, unknown>; idempotencyKey: string; reason: string };

export type Recommendation = { title: string; why: string; evidence: string[]; action?: PendingAction };

export type AgentRun = {
  id: string;
  prompt: string;
  intent: Intent;
  companyId?: string;
  plan: string;
  steps: TraceStep[];
  summary: string;
  recommendations: Recommendation[];
  pending: PendingAction[];
  warnings: string[];
  provider: string;
  llmAttempts: number;
  totalMs: number;
};

const evidenceOf = (r: unknown): string[] => (r && typeof r === "object" && "evidence" in r ? (r as { evidence: string[] }).evidence : []);

export function classifyIntent(prompt: string): Intent {
  const p = prompt.toLowerCase();
  if (/(delete|remove|disconnect).*(integration|connector|hubspot|slack)/.test(p)) return "admin";
  if (/\b(send|email|dm|message|reach out|outreach)\b/.test(p)) return "outbound";
  if (/(warm path|intro|introduc|who (do we|can) know|connection)/.test(p)) return "warm_path";
  if (/(draft|campaign|post|content|narrative|write)/.test(p)) return "content_plan";
  if (/(attribut|credit|influenc|what (drove|caused))/.test(p)) return "attribution";
  if (/(summar|tell me about|overview|who is|brief)/.test(p)) return "account_summary";
  return "next_best_action";
}

export function resolveCompany(ws: Workspace, prompt: string, fallback?: string) {
  const p = prompt.toLowerCase();
  const hit = ws.targets.find((c) => p.includes(c.name.toLowerCase()) || p.includes(c.name.split(" ")[0]!.toLowerCase()));
  return hit?.id ?? fallback;
}

export async function runAgent(
  ws: Workspace,
  prompt: string,
  opts: { companyId?: string; provider?: LlmProvider; clock?: () => number } = {},
): Promise<AgentRun> {
  const clock = opts.clock ?? (() => performance.now());
  const t0 = clock();
  const provider = opts.provider ?? deterministicProvider;
  const intent = classifyIntent(prompt);
  const companyId = resolveCompany(ws, prompt, opts.companyId) ?? ws.accounts[0]?.company.id;
  const steps: TraceStep[] = [];
  const pending: PendingAction[] = [];
  const warnings: string[] = [];
  const out: Record<string, unknown> = {};

  const call = (tool: ToolName, input: Record<string, unknown>) => {
    const def = TOOLS[tool];
    const s = clock();
    if (def.policy === "DENY") {
      steps.push({ tool, policy: def.policy, input, status: "denied", summary: "Denied by policy: agents may not perform this action.", evidence: [], durationMs: clock() - s });
      return undefined;
    }
    if (def.policy === "REQUIRE_APPROVAL") {
      const idempotencyKey = idempotencyKeyFor(tool, input);
      const action: PendingAction = { approvalId: `apr_${hashString(idempotencyKey)}`, tool, input, idempotencyKey, reason: def.description };
      pending.push(action);
      steps.push({ tool, policy: def.policy, input, status: "approval_required", summary: "Paused: waiting for human approval. Nothing was sent.", evidence: [], durationMs: clock() - s });
      return action;
    }
    const parsed = def.input.safeParse(input);
    if (!parsed.success) {
      steps.push({ tool, policy: def.policy, input, status: "error", summary: `Invalid input: ${parsed.error.issues[0]?.message}`, evidence: [], durationMs: clock() - s });
      return undefined;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = def.run(ws, parsed.data as any);
    for (const text of r.untrustedText ?? []) {
      if (INJECTION_PATTERN.test(text)) warnings.push(`Ignored instruction-like text inside ingested content: “${text.slice(0, 90)}…”. Ingested text is data, never instructions.`);
    }
    steps.push({ tool, policy: def.policy, input, status: "ok", summary: r.summary, evidence: r.evidence, durationMs: clock() - s });
    out[tool] = r;
    return r;
  };

  const acct = ws.accounts.find((a) => a.company.id === companyId);
  const cname = companyName(ws, companyId);
  const recs: AgentRun["recommendations"] = [];
  let plan = "";

  switch (intent) {
    case "admin": {
      plan = "Request is an administrative destructive action; check policy.";
      call("delete_integration", { provider: /slack/i.test(prompt) ? "slack" : "hubspot" });
      recs.push({ title: "This action is not available to the agent", why: "Deleting integrations is denied to agents by policy. An admin can do this from Settings → Integrations.", evidence: [] });
      break;
    }
    case "warm_path": {
      plan = `Find relationship paths into ${cname} and explain the strongest one.`;
      call("get_people_at_company", { companyId });
      const r = call("find_warm_paths", { companyId, limit: 3 });
      const best = acct?.bestPath;
      if (best && r) {
        const via = best.nodeIds.length > 2 ? personName(ws, best.nodeIds[1]) : undefined;
        recs.push({
          title: via ? `Ask ${via} for context on ${personName(ws, best.targetId)}` : `${personName(ws, best.sourceId)} reaches out to ${personName(ws, best.targetId)} directly`,
          why: `Path score ${best.score.toFixed(2)} — weakest link ${best.components.relationship_strength.toFixed(2)}, recency ${best.components.recency_score.toFixed(2)}, role relevance ${best.components.role_relevance.toFixed(2)}.`,
          evidence: best.evidence,
        });
      }
      break;
    }
    case "content_plan": {
      const c = ws.campaigns.find((x) => x.targetAccounts.includes(companyId ?? "")) ?? ws.campaigns[0]!;
      plan = `Plan differentiated executive content for "${c.theme}".`;
      call("get_campaign_context", { campaignId: c.id });
      for (const persona of ["ceo", "vp_sales", "head_marketing"] as const) call("retrieve_persona_memory", { persona });
      for (const persona of ["ceo", "vp_sales", "head_marketing"] as const) call("create_content_draft", { campaignId: c.id, persona });
      call("score_content_overlap", { campaignId: c.id });
      const drafts = ws.campaignDrafts.get(c.id)?.drafts ?? [];
      for (const d of drafts) recs.push({ title: `${d.persona === "ceo" ? "CEO" : d.persona === "vp_sales" ? "VP Sales" : "Marketing"}: ${d.title}`, why: `${d.angle.replace("_", " ")} angle · ${d.checks.filter((x) => x.passed).length}/${d.checks.length} checks pass`, evidence: [] });
      const sched = call("schedule_draft", { draftId: drafts[0]?.id ?? "" }) as { approvalId: string } | undefined;
      if (sched) recs.push({ title: "Schedule the CEO draft", why: "Scheduling publishes externally, so it waits for approval.", evidence: [], action: pending.at(-1) });
      break;
    }
    case "attribution": {
      const opp = acct?.opportunity;
      plan = `Explain which touches contributed to ${opp?.name ?? `${cname}'s pipeline`}.`;
      call("get_opportunity", { companyId });
      if (opp) {
        const g = call("compute_attribution", { opportunityId: opp.id, model: "graph_assisted" });
        call("compute_attribution", { opportunityId: opp.id, model: "last_touch" });
        recs.push({ title: "Graph-assisted credit favors relationship touches over the final click", why: "Compare with last-touch in the Attribution view. Credit assignment is not causal proof.", evidence: evidenceOf(g) });
      }
      break;
    }
    case "outbound": {
      plan = `User asked for outbound to ${cname}; gather context, then gate the send.`;
      call("get_people_at_company", { companyId });
      call("find_warm_paths", { companyId, limit: 1 });
      const target = acct?.bestPath?.targetId ?? acct?.people[0]?.id ?? "";
      const action = call("send_message", { contactId: target, body: `Following up on ${cname}` }) as ReturnType<typeof call>;
      recs.push({ title: `Message to ${personName(ws, target)} is drafted, not sent`, why: "send_message requires human approval. Approving executes it once (idempotency key) and records an audit event.", evidence: acct?.bestPath?.evidence ?? [], action: action ? pending.at(-1) : undefined });
      break;
    }
    case "account_summary":
    case "next_best_action": {
      plan = intent === "account_summary" ? `Summarize ${cname} from stored events.` : `Decide the next best action for ${cname} from graph, timeline, CRM and campaign context.`;
      call("get_people_at_company", { companyId });
      const tl = call("get_account_timeline", { companyId, limit: 12 });
      const wp = call("find_warm_paths", { companyId, limit: 3 });
      call("get_opportunity", { companyId });
      if (intent === "next_best_action") call("get_campaign_context", {});
      const best = acct?.bestPath;
      const topic = acct?.signals.find((s) => s.type === "topic_resonance");
      if (best && wp) {
        const via = best.nodeIds.length > 2 ? personName(ws, best.nodeIds[1]) : undefined;
        recs.push({
          title: via ? `${personName(ws, best.sourceId)} asks ${via} to re-open the thread with ${personName(ws, best.targetId)}` : `${personName(ws, best.sourceId)} follows up with ${personName(ws, best.targetId)} directly`,
          why: `Strongest relationship path (score ${best.score.toFixed(2)}); ${best.hops.length === 1 ? "already a direct relationship" : `${best.hops.length} hops`}.`,
          evidence: best.evidence,
        });
      }
      if (topic) recs.push({ title: `Lead with "${topic.title.match(/"(.+)"/)?.[1] ?? "their top topic"}" in this week's CEO post`, why: topic.why, evidence: topic.evidence.slice(0, 6) });
      if (intent === "next_best_action" && best) {
        const body = `Context for ${personName(ws, best.targetId)}: ${acct?.engagement14d ?? 0} interactions from ${cname} in 14 days; best path via ${best.nodeIds.map((id) => personName(ws, id)).join(" → ")}.`;
        call("create_crm_note", { contactId: best.targetId, body });
        recs.push({ title: `Log account context on ${personName(ws, best.targetId)} in the CRM`, why: "Keeps Sales and the CEO on the same thread. Writing to the CRM is an external side effect → approval.", evidence: evidenceOf(tl).slice(0, 4), action: pending.at(-1) });
      }
      break;
    }
  }

  // Summarize through the provider. On timeout: retry once, then fall back to a template.
  // Side effects are never re-issued on retry — they are already pending with fixed idempotency keys.
  let summary = "";
  let llmAttempts = 0;
  const facts = { intent, company: cname, plan, recs: recs.map((r) => r.title), pending: pending.length };
  for (let attempt = 1; attempt <= 2 && !summary; attempt++) {
    llmAttempts = attempt;
    try {
      summary = await provider.summarize(facts);
    } catch (err) {
      warnings.push(`LLM provider attempt ${attempt} failed: ${err instanceof Error ? err.message : String(err)}${attempt === 2 ? " — used template fallback" : " — retrying"}`);
    }
  }
  if (!summary) summary = await deterministicProvider.summarize(facts);

  return {
    id: `run_${hashString(prompt + (companyId ?? ""))}`,
    prompt,
    intent,
    companyId,
    plan,
    steps,
    summary,
    recommendations: recs,
    pending,
    warnings,
    provider: provider.name,
    llmAttempts,
    totalMs: clock() - t0,
  };
}
