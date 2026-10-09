/**
 * Multi-touch attribution. Six models over the same eligible touch set so they can be compared.
 * Contract: weights sum to 1.0, every exclusion has a reason, and output always carries the caveat
 * that this is credit assignment — NOT causal proof.
 */
import type { Opportunity, Provider, ResolvedEvent } from "../contracts";
import type { Directory } from "../identity/resolve";
import type { Graph } from "../graph/project";
import { ageInDays, DAY_MS } from "../lib/time";

export const ATTRIBUTION_VERSION = "attr-v2";
export const MODELS = ["first_touch", "last_touch", "linear", "time_decay", "position_based", "graph_assisted"] as const;
export type AttributionModel = (typeof MODELS)[number];

export const MODEL_LABELS: Record<AttributionModel, string> = {
  first_touch: "First touch",
  last_touch: "Last touch",
  linear: "Linear",
  time_decay: "Time decay",
  position_based: "Position based",
  graph_assisted: "Graph assisted",
};

const TOUCH_TYPES = ["person_liked_post", "person_commented_post", "team_replied_comment", "introduction_made", "meeting_created", "crm_note_created"] as const;
type TouchType = (typeof TOUCH_TYPES)[number];

export const EVENT_TYPE_WEIGHT: Record<TouchType, number> = {
  person_liked_post: 0.4,
  person_commented_post: 1.0,
  team_replied_comment: 0.8,
  introduction_made: 1.6,
  meeting_created: 1.4,
  crm_note_created: 0.5,
};

export const SOURCE_RELIABILITY: Record<Provider, number> = { manual: 1, csv_crm: 0.95, hubspot: 0.95, slack: 0.85, social: 0.75 };

export const LOOKBACK_DAYS = 90;
export const MIN_IDENTITY_CONFIDENCE = 0.5;

export type Touch = {
  eventId: string;
  type: TouchType;
  occurredAt: string;
  actorId?: string;
  label: string;
  daysBeforeOpen: number;
  factors: { event_type_weight: number; recency_decay: number; relationship_strength: number; identity_confidence: number; source_reliability: number };
};

export type WeightedTouch = Touch & { weight: number; explanation: string };

export type AttributionResult = {
  opportunityId: string;
  model: AttributionModel;
  version: string;
  touches: WeightedTouch[];
  excluded: { eventId: string; label: string; reason: string }[];
  confidence: "low" | "medium" | "high";
  caveats: string[];
};

const describe = (e: ResolvedEvent, dir: Directory) => {
  const who = (id?: string) => (id ? (dir.people.get(id)?.name ?? id) : "unknown");
  switch (e.type) {
    case "person_liked_post":
      return `${who(e.actorId)} liked a post`;
    case "person_commented_post":
      return `${who(e.actorId)} commented on a post`;
    case "team_replied_comment":
      return `${who(e.actorId)} replied to ${who(e.subjectId)}`;
    case "introduction_made":
      return `${who(e.actorId)} introduced ${who(e.subjectId)}`;
    case "meeting_created":
      return `Meeting: ${String(e.metadata.title)}`;
    case "crm_note_created":
      return `CRM note on ${who(e.subjectId)}`;
    default:
      return e.type;
  }
};

/** Warmth of a person toward our team: strongest direct relationship edge, floored for cold contacts. */
function relationshipStrength(personId: string | undefined, g: Graph, dir: Directory) {
  if (!personId) return 0.25;
  let best = 0.25;
  for (const e of g.edges.values()) {
    if (!["KNOWS", "CONNECTED_TO", "MET_WITH"].includes(e.type)) continue;
    const other = e.from === personId ? e.to : e.to === personId ? e.from : undefined;
    if (other && dir.people.get(other)?.isTeamMember) best = Math.max(best, e.strength);
  }
  return best;
}

export function eligibleTouches(opp: Opportunity, events: readonly ResolvedEvent[], g: Graph, dir: Directory) {
  const openedAt = Date.parse(opp.openedAt);
  const touches: Touch[] = [];
  const excluded: AttributionResult["excluded"] = [];
  for (const e of events) {
    if (e.companyId !== opp.companyId || !(TOUCH_TYPES as readonly string[]).includes(e.type)) continue;
    const t = Date.parse(e.occurredAt);
    const label = describe(e, dir);
    if (t > openedAt) {
      if (t - openedAt < 30 * DAY_MS) excluded.push({ eventId: e.id, label, reason: "occurred after the opportunity opened" });
      continue;
    }
    if (openedAt - t > LOOKBACK_DAYS * DAY_MS) {
      excluded.push({ eventId: e.id, label, reason: `outside ${LOOKBACK_DAYS}-day lookback window` });
      continue;
    }
    if (e.identityConfidence < MIN_IDENTITY_CONFIDENCE) {
      excluded.push({ eventId: e.id, label, reason: `identity confidence ${e.identityConfidence.toFixed(2)} below ${MIN_IDENTITY_CONFIDENCE}` });
      continue;
    }
    const type = e.type as TouchType;
    const daysBeforeOpen = ageInDays(e.occurredAt, openedAt);
    const personId = e.type === "team_replied_comment" || e.type === "introduction_made" ? e.subjectId : e.actorId;
    touches.push({
      eventId: e.id,
      type,
      occurredAt: e.occurredAt,
      actorId: e.actorId,
      label,
      daysBeforeOpen,
      factors: {
        event_type_weight: EVENT_TYPE_WEIGHT[type],
        recency_decay: Math.exp(-daysBeforeOpen / 21),
        relationship_strength: relationshipStrength(personId, g, dir),
        identity_confidence: e.identityConfidence,
        source_reliability: SOURCE_RELIABILITY[e.source],
      },
    });
  }
  touches.sort((a, b) => (a.occurredAt < b.occurredAt ? -1 : 1));
  return { touches, excluded };
}

function rawWeights(model: AttributionModel, touches: Touch[]): number[] {
  const n = touches.length;
  if (n === 0) return [];
  switch (model) {
    case "first_touch":
      return touches.map((_, i) => (i === 0 ? 1 : 0));
    case "last_touch":
      return touches.map((_, i) => (i === n - 1 ? 1 : 0));
    case "linear":
      return touches.map(() => 1);
    case "time_decay":
      return touches.map((t) => Math.pow(2, -t.daysBeforeOpen / 7));
    case "position_based":
      if (n === 1) return [1];
      if (n === 2) return [0.5, 0.5];
      return touches.map((_, i) => (i === 0 || i === n - 1 ? 0.4 : 0.2 / (n - 2)));
    case "graph_assisted":
      return touches.map((t) => Object.values(t.factors).reduce((p, f) => p * f, 1));
  }
}

const explain = (model: AttributionModel, t: Touch, i: number, n: number) => {
  switch (model) {
    case "first_touch":
      return i === 0 ? "Earliest eligible touch receives all credit." : "Not the first touch.";
    case "last_touch":
      return i === n - 1 ? "Closest touch before the opportunity opened receives all credit." : "Not the last touch.";
    case "linear":
      return `Equal share across ${n} eligible touches.`;
    case "time_decay":
      return `Half-life 7 days; occurred ${t.daysBeforeOpen.toFixed(1)} days before open.`;
    case "position_based":
      return i === 0 || i === n - 1 ? "First/last position: 40% anchor." : "Middle touch: shares 20%.";
    case "graph_assisted": {
      const f = t.factors;
      return `type ${f.event_type_weight} × recency ${f.recency_decay.toFixed(2)} × relationship ${f.relationship_strength.toFixed(2)} × identity ${f.identity_confidence.toFixed(2)} × source ${f.source_reliability}`;
    }
  }
};

export function attribute(opp: Opportunity, model: AttributionModel, events: readonly ResolvedEvent[], g: Graph, dir: Directory): AttributionResult {
  const { touches, excluded } = eligibleTouches(opp, events, g, dir);
  const raw = rawWeights(model, touches);
  const total = raw.reduce((s, w) => s + w, 0);
  const weighted = touches.map((t, i) => ({ ...t, weight: total > 0 ? raw[i]! / total : 0, explanation: explain(model, t, i, touches.length) }));
  const meanIdentity = touches.length ? touches.reduce((s, t) => s + t.factors.identity_confidence, 0) / touches.length : 0;
  const confidence = touches.length >= 5 && meanIdentity >= 0.85 ? "high" : touches.length >= 3 ? "medium" : "low";
  const caveats = [
    "Attribution assigns credit across observed touches. It is not causal proof that any touch caused the opportunity.",
    "Only touches captured by connected sources are visible; offline conversations are missing by construction.",
  ];
  if (excluded.some((x) => x.reason.startsWith("identity"))) caveats.push("Some touches were excluded because the person could not be confidently identified.");
  if (touches.length < 3) caveats.push("Fewer than 3 eligible touches — treat any model's weights as anecdotal.");
  if (model === "graph_assisted") caveats.push("Graph-assisted factors are hand-set heuristics (see docs/attribution.md), not a learned model.");
  return { opportunityId: opp.id, model, version: ATTRIBUTION_VERSION, touches: weighted, excluded, confidence, caveats };
}
