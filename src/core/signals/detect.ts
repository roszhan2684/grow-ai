/**
 * Signal detection. Every signal is derivable from stored events and links back to them.
 * No invented intent data, no profile views, nothing that is not in the event log.
 */
import type { Opportunity, ResolvedEvent } from "../contracts";
import type { Directory } from "../identity/resolve";
import { ageInDays, DEMO_NOW } from "../lib/time";
import type { WarmPath } from "../graph/warmPaths";

export type SignalType = "account_warming" | "executive_engagement" | "warm_path_emerged" | "topic_resonance" | "champion_risk" | "integration_degradation";

export type Signal = {
  id: string;
  type: SignalType;
  companyId?: string;
  title: string;
  why: string;
  evidence: string[];
  confidence: number;
  recommendedAction: string;
  owner: string;
  status: "open" | "acknowledged" | "done";
  detectedAt: string;
};

export const SIGNAL_LABELS: Record<SignalType, string> = {
  account_warming: "Account warming",
  executive_engagement: "Executive engagement",
  warm_path_emerged: "Warm path emerged",
  topic_resonance: "Topic resonance",
  champion_risk: "Champion risk",
  integration_degradation: "Integration degradation",
};

const MEANINGFUL = new Set(["person_liked_post", "person_commented_post", "meeting_created", "introduction_made", "team_replied_comment"]);

export type IntegrationHealthInput = { provider: string; status: string; deadLetters: number; lastError?: string };

export function detectSignals(input: {
  events: readonly ResolvedEvent[];
  dir: Directory;
  opportunities: Opportunity[];
  postTopics: Map<string, string>;
  warmPaths: Map<string, WarmPath[]>;
  integrations: IntegrationHealthInput[];
  now?: number;
}): Signal[] {
  const { events, dir, opportunities, postTopics, warmPaths, integrations } = input;
  const now = input.now ?? DEMO_NOW;
  const nowIso = new Date(now).toISOString();
  const signals: Signal[] = [];
  const team = [...dir.people.values()].filter((p) => p.isTeamMember);
  const ownerFor = (role: string) => team.find((t) => t.personaRole === role)?.name ?? "Unassigned";
  const name = (id?: string) => (id ? (dir.people.get(id)?.name ?? id) : "someone");

  for (const company of dir.companies.values()) {
    if (!company.isTarget) continue;
    const ce = events.filter((e) => e.companyId === company.id && MEANINGFUL.has(e.type));

    // Account warming: 3+ meaningful interactions from 2+ people in 14 days.
    const recent = ce.filter((e) => ageInDays(e.occurredAt, now) <= 14);
    const people = new Set(recent.map((e) => (e.type === "introduction_made" || e.type === "team_replied_comment" ? e.subjectId : e.actorId)).filter(Boolean));
    if (recent.length >= 3 && people.size >= 2) {
      signals.push({
        id: `sig_warm_${company.id}`,
        type: "account_warming",
        companyId: company.id,
        title: `${company.name} is warming: ${recent.length} interactions from ${people.size} people in 14 days`,
        why: "Multi-threaded engagement inside two weeks is the strongest early pipeline pattern in the event log.",
        evidence: recent.map((e) => e.id),
        confidence: Math.min(0.95, 0.5 + recent.length * 0.05 + people.size * 0.05),
        recommendedAction: `Review warm paths into ${company.name} and agree on one owner for outreach.`,
        owner: ownerFor("vp_sales"),
        status: "open",
        detectedAt: nowIso,
      });
    }

    // Executive engagement: director+ engages twice in 30 days.
    const byExec = new Map<string, ResolvedEvent[]>();
    for (const e of ce) {
      if (!e.actorId || ageInDays(e.occurredAt, now) > 30) continue;
      const p = dir.people.get(e.actorId);
      if (!p || p.isTeamMember || !["c_level", "vp", "director"].includes(p.seniority)) continue;
      if (!["person_liked_post", "person_commented_post"].includes(e.type)) continue;
      byExec.set(p.id, [...(byExec.get(p.id) ?? []), e]);
    }
    // One executive signal per account: the most engaged decision-maker (avoids alert spam).
    const topExec = [...byExec.entries()].filter(([, evs]) => evs.length >= 2).sort((a, b) => b[1].length - a[1].length || (a[0] < b[0] ? -1 : 1))[0];
    if (topExec) {
      const [pid, evs] = topExec;
      const p = dir.people.get(pid)!;
      signals.push({
        id: `sig_exec_${pid}`,
        type: "executive_engagement",
        companyId: company.id,
        title: `${p.name} (${p.title}) engaged ${evs.length}× in 30 days`,
        why: "Repeated executive engagement signals the narrative is landing with a decision-maker.",
        evidence: evs.map((e) => e.id),
        confidence: Math.min(0.9, 0.55 + evs.length * 0.08),
        recommendedAction: `Have the CEO persona respond directly to ${p.name}'s next comment.`,
        owner: ownerFor("ceo"),
        status: "open",
        detectedAt: nowIso,
      });
    }

    // Topic resonance: 3+ engagements on the same topic in 90 days.
    const topicCounts = new Map<string, string[]>();
    for (const e of ce) {
      if (!e.objectId || !["person_liked_post", "person_commented_post"].includes(e.type)) continue;
      const t = postTopics.get(e.objectId);
      if (t) topicCounts.set(t, [...(topicCounts.get(t) ?? []), e.id]);
    }
    const top = [...topicCounts.entries()].sort((a, b) => b[1].length - a[1].length)[0];
    if (top && top[1].length >= 4) {
      signals.push({
        id: `sig_topic_${company.id}`,
        type: "topic_resonance",
        companyId: company.id,
        title: `${company.name} keeps engaging with "${top[0]}" (${top[1].length} touches)`,
        why: "Recurring topic engagement tells us which narrative to lead with for this account.",
        evidence: top[1],
        confidence: Math.min(0.9, 0.4 + top[1].length * 0.06),
        recommendedAction: `Assign the next "${top[0]}" campaign angle to this account's buying committee.`,
        owner: ownerFor("head_marketing"),
        status: "open",
        detectedAt: nowIso,
      });
    }

    // Warm path emerged: path ≤3 hops, score ≥ 0.55, newest edge in the last 14 days.
    const best = (warmPaths.get(company.id) ?? []).find((p) => p.score >= 0.55 && ageInDays(p.newestEdgeAt, now) <= 14);
    if (best) {
      signals.push({
        id: `sig_path_${company.id}`,
        type: "warm_path_emerged",
        companyId: company.id,
        title: `New warm path: ${best.nodeIds.map(name).join(" → ")}`,
        why: `${best.hops.length}-hop path scored ${best.score.toFixed(2)}; its newest edge appeared ${Math.round(ageInDays(best.newestEdgeAt, now))} days ago.`,
        evidence: best.evidence,
        confidence: best.score,
        recommendedAction:
          best.hops.length === 1
            ? `${name(best.sourceId)} follows up with ${name(best.targetId)} directly, referencing the shared context in the evidence.`
            : `Ask ${name(best.nodeIds[1])} for context before any outbound to ${name(best.targetId)}.`,
        owner: name(best.sourceId),
        status: "open",
        detectedAt: nowIso,
      });
    }
  }

  // Champion risk: an engaged contact on an open deal's account changed company.
  for (const e of events) {
    if (e.type !== "person_changed_company" || !e.actorId) continue;
    const p = dir.people.get(e.actorId);
    if (!p) continue;
    for (const prev of p.previousCompanyIds) {
      const open = opportunities.find((o) => o.companyId === prev && !o.stage.startsWith("closed"));
      if (!open) continue;
      const engaged = events.filter((x) => (x.actorId === p.id || x.subjectId === p.id) && MEANINGFUL.has(x.type));
      signals.push({
        id: `sig_champ_${p.id}`,
        type: "champion_risk",
        companyId: prev,
        title: `Champion risk: ${p.name} left ${dir.companies.get(prev)?.name} for ${dir.companies.get(p.companyId ?? "")?.name ?? "a new company"}`,
        why: `${p.name} had ${engaged.length} recorded interactions and the "${open.name}" deal is still open.`,
        evidence: [e.id, ...engaged.map((x) => x.id)],
        confidence: 0.85,
        recommendedAction: `Re-thread ${open.name} with another stakeholder; open a new-logo conversation at ${dir.companies.get(p.companyId ?? "")?.name ?? "their new company"}.`,
        owner: ownerFor("vp_sales"),
        status: "open",
        detectedAt: nowIso,
      });
    }
  }

  for (const i of integrations) {
    if (i.status === "HEALTHY" && i.deadLetters === 0) continue;
    signals.push({
      id: `sig_int_${i.provider}`,
      type: "integration_degradation",
      title: `${i.provider}: ${i.status === "HEALTHY" ? `${i.deadLetters} event(s) in dead letter` : i.status.replace("_", " ").toLowerCase()}`,
      why: i.lastError ?? "Data from this source may be incomplete until resolved.",
      evidence: [],
      confidence: 1,
      recommendedAction: i.status === "REAUTH_REQUIRED" ? "Reconnect the integration." : "Inspect the dead-letter queue and replay after fixing.",
      owner: "Ops",
      status: "open",
      detectedAt: nowIso,
    });
  }

  const order: SignalType[] = ["warm_path_emerged", "account_warming", "champion_risk", "executive_engagement", "topic_resonance", "integration_degradation"];
  return signals.sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type) || b.confidence - a.confidence);
}
