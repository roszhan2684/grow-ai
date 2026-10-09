"use client";

/**
 * Demo runtime. The public demo has no database: the org's extra events (approvals, imports,
 * engagement, CRM notes, repairs) live in this browser and are replayed through the same
 * deterministic engine on every change. Reset = drop the local log and re-derive from the seed.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { RawEvent } from "@/core/contracts";
import { generateSeed } from "@/core/seed/generate";
import { buildWorkspace, type Workspace } from "@/core/workspace";
import type { Signal } from "@/core/signals/detect";
import type { PendingAction } from "@/core/agents/runtime";
import type { Draft } from "@/core/content/engine";
import { DEMO_NOW } from "@/core/lib/time";
import { emailFor, personByKey } from "@/core/seed/universe";
import { PLANS, type PlanId } from "@/core/billing/plans";

export const SEED = generateSeed();

export type Role = "owner" | "admin" | "operator" | "member" | "viewer";
export type Member = { id: string; name: string; email: string; role: Role; seat: "active" | "invited" };
export type AuditEntry = { id: string; at: string; actor: string; action: string; resource: string; detail?: string };

type DemoState = {
  extraEvents: RawEvent[];
  draftStatus: Record<string, "pending" | "approved" | "rejected">;
  draftEdits: Record<string, string>;
  actionDecisions: Record<string, "approved" | "rejected">;
  executedKeys: string[];
  graphOutageAt: number | null;
  merges: Record<string, string>;
  signalStatus: Record<string, Signal["status"]>;
  plan: PlanId;
  members: Member[];
  audit: AuditEntry[];
  agentRuns: number;
  csvImports: number;
  seq: number;
};

const INITIAL: DemoState = {
  extraEvents: [],
  draftStatus: {},
  draftEdits: {},
  actionDecisions: {},
  executedKeys: [],
  graphOutageAt: null,
  merges: {},
  signalStatus: {},
  plan: "starter",
  members: [
    { id: "m1", name: "Maya Okafor", email: emailFor(personByKey("maya")), role: "owner", seat: "active" },
    { id: "m2", name: "Daniel Reyes", email: emailFor(personByKey("daniel")), role: "admin", seat: "active" },
    { id: "m3", name: "Priya Shah", email: emailFor(personByKey("priya")), role: "operator", seat: "active" },
  ],
  audit: [],
  agentRuns: 0,
  csvImports: 0,
  seq: 0,
};

const STORAGE_KEY = "grow-ai-demo-v1";
const ACTOR = "maya.okafor@northstar-cloud.example";

function useDemoState() {
  const [state, setState] = useState<DemoState>(INITIAL);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setState({ ...INITIAL, ...(JSON.parse(raw) as DemoState) });
    } catch {
      /* private mode / blocked storage: the demo still works, it just won't persist */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state, hydrated]);

  return { state, setState, hydrated };
}

const Ctx = createContext<ReturnType<typeof useStoreValue> | null>(null);

function useStoreValue() {
  const { state, setState, hydrated } = useDemoState();

  const rawEvents = useMemo(() => [...SEED.rawEvents, ...state.extraEvents], [state.extraEvents]);
  const ws: Workspace = useMemo(
    () => buildWorkspace(rawEvents, { graphFrozenAtRaw: state.graphOutageAt ?? undefined, identityMerges: state.merges }),
    [rawEvents, state.graphOutageAt, state.merges],
  );

  const stamp = (seq: number) => new Date(DEMO_NOW + (seq + 1) * 60_000).toISOString();

  const mutate = useCallback(
    (fn: (s: DemoState, at: string) => Partial<DemoState>, audit?: Omit<AuditEntry, "id" | "at" | "actor">) =>
      setState((s) => {
        const at = stamp(s.seq);
        const patch = fn(s, at);
        const entry = audit ? [{ id: `aud_${s.seq + 1}`, at, actor: ACTOR, ...audit }] : [];
        return { ...s, ...patch, seq: s.seq + 1, audit: [...entry, ...(patch.audit ?? s.audit)] };
      }),
    [setState],
  );

  const actions = {
    approveDraft: (d: Draft, persona: string) =>
      mutate(
        (s, at) => ({
          draftStatus: { ...s.draftStatus, [d.id]: "approved" },
          extraEvents: s.extraEvents.some((e) => e.providerEventId === `approve_${d.id}`)
            ? s.extraEvents
            : [...s.extraEvents, { provider: "manual", providerEventId: `approve_${d.id}`, kind: "draft.approved", receivedAt: at, payload: { draftId: d.id, approverEmail: ACTOR, personaEmail: emailFor(personByKey(persona)), title: d.title, topic: d.campaignId.includes("cost") ? "Cloud cost control" : "Platform reliability" } }],
        }),
        { action: "draft.approved", resource: d.id, detail: d.title },
      ),
    rejectDraft: (d: Draft) => mutate((s) => ({ draftStatus: { ...s.draftStatus, [d.id]: "rejected" } }), { action: "draft.rejected", resource: d.id }),
    editDraft: (id: string, body: string) => setState((s) => ({ ...s, draftEdits: { ...s.draftEdits, [id]: body } })),
    recordEngagement: (postId: string, personKey: string, comment?: string) =>
      mutate(
        (s, at) => {
          const p = personByKey(personKey);
          const id = `eng_${postId}_${personKey}_${s.seq}`;
          return { extraEvents: [...s.extraEvents, { provider: "manual", providerEventId: id, kind: "engagement.recorded", receivedAt: at, payload: { postId, actor: { handle: p.handle ?? p.name.toLowerCase().replace(/[^a-z]+/g, "-"), name: p.name }, ...(comment ? { comment } : {}) } }] };
        },
        { action: "engagement.recorded", resource: postId, detail: personKey },
      ),
    /** Execute an approved agent action exactly once, keyed by its idempotency key. */
    executeAction: (a: PendingAction) =>
      mutate(
        (s, at) => {
          if (s.executedKeys.includes(a.idempotencyKey)) return { actionDecisions: { ...s.actionDecisions, [a.approvalId]: "approved" } };
          const extra: RawEvent[] =
            a.tool === "create_crm_note"
              ? [{ provider: "manual", providerEventId: `crm_note_${a.idempotencyKey}`, kind: "crm.note_created", receivedAt: at, payload: { contactEmail: ws.directory.people.get(String(a.input.contactId))?.email ?? "unknown@example.com", authorEmail: ACTOR, body: String(a.input.body), idempotencyKey: a.idempotencyKey } }]
              : [];
          return { actionDecisions: { ...s.actionDecisions, [a.approvalId]: "approved" }, executedKeys: [...s.executedKeys, a.idempotencyKey], extraEvents: [...s.extraEvents, ...extra] };
        },
        { action: `agent.${a.tool}.approved`, resource: a.approvalId, detail: `idempotency_key=${a.idempotencyKey}` },
      ),
    rejectAction: (a: PendingAction) => mutate((s) => ({ actionDecisions: { ...s.actionDecisions, [a.approvalId]: "rejected" } }), { action: `agent.${a.tool}.rejected`, resource: a.approvalId }),
    importCsv: (events: RawEvent[]) => mutate((s, at) => ({ extraEvents: [...s.extraEvents, ...events.map((e) => ({ ...e, receivedAt: at }))], csvImports: s.csvImports + 1 }), { action: "integration.csv_import", resource: "csv_crm", detail: `${events.length} rows` }),
    startGraphOutage: () => mutate((s) => ({ graphOutageAt: SEED.rawEvents.length + s.extraEvents.length }), { action: "failure.injected", resource: "neo4j", detail: "graph projection unavailable" }),
    restoreGraph: () => mutate(() => ({ graphOutageAt: null }), { action: "graph.replayed", resource: "neo4j", detail: "projection caught up from normalized events" }),
    mergeIdentity: (handle: string, personId: string) => mutate((s) => ({ merges: { ...s.merges, [handle]: personId } }), { action: "identity.merged", resource: handle, detail: personId }),
    repairDeadLetter: (rawId: string, original: RawEvent, payload: Record<string, unknown>) =>
      mutate((s, at) => ({ extraEvents: [...s.extraEvents, { ...original, providerEventId: `${original.providerEventId}:repair`, receivedAt: at, payload: { ...payload, repairOf: rawId } }] }), { action: "dead_letter.repaired_and_replayed", resource: rawId }),
    setSignalStatus: (id: string, status: Signal["status"]) => mutate((s) => ({ signalStatus: { ...s.signalStatus, [id]: status } }), { action: `signal.${status}`, resource: id }),
    inviteMember: (name: string, email: string, role: Role) => {
      let ok = false;
      mutate(
        (s) => {
          if (s.members.length >= PLANS[s.plan].seats) return {};
          ok = true;
          return { members: [...s.members, { id: `m${s.members.length + 1}_${s.seq}`, name, email, role, seat: "invited" }] };
        },
        { action: "member.invited", resource: email, detail: role },
      );
      return ok;
    },
    changeRole: (id: string, role: Role) => mutate((s) => ({ members: s.members.map((m) => (m.id === id ? { ...m, role } : m)) }), { action: "member.role_changed", resource: id, detail: role }),
    changePlan: (plan: PlanId) => mutate(() => ({ plan }), { action: "billing.plan_changed", resource: "subscription", detail: `${plan} (${PLANS[plan].seats} seats) · test mode` }),
    noteAgentRun: () => setState((s) => ({ ...s, agentRuns: s.agentRuns + 1 })),
    reset: () => {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
      setState(INITIAL);
    },
  };

  return { ws, state, hydrated, actions, rawEvents };
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const value = useStoreValue();
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDemo() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useDemo must be used inside <WorkspaceProvider>");
  return v;
}

/** Activation is derived from real state, not a stored flag. */
export function activationSteps(ws: Workspace, state: DemoState) {
  const team = [...ws.directory.people.values()].filter((p) => p.personaRole);
  return [
    { id: "org", label: "Create organization", done: true, detail: "Northstar Cloud (synthetic)" },
    { id: "personas", label: "Add 3 executive personas", done: team.length >= 3, detail: `${team.length} personas` },
    { id: "integrations", label: "Connect a data source", done: ws.integrations.some((i) => i.received > 0), detail: `${ws.integrations.filter((i) => i.received > 0).length} sources connected` },
    { id: "graph", label: "Build the first relationship graph", done: ws.graph.edges.size > 0, detail: `${ws.graph.nodes.size} nodes · ${ws.graph.edges.size} edges` },
    { id: "campaign", label: "Approve a campaign draft", done: Object.values(state.draftStatus).includes("approved"), detail: "Campaigns → approve one persona draft" },
    { id: "agent", label: "Ask the agent a question", done: state.agentRuns > 0, detail: "Agent → “What should we do next?”" },
  ];
}
