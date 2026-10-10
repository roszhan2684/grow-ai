"use client";

import { useState } from "react";
import { useDemo, type Role } from "@/lib/demo-store";
import { Badge, Button, Card, SectionTitle, cx } from "@/components/ui";
import { PLANS, type PlanId } from "@/core/billing/plans";
import { PERSONA_STRATEGY } from "@/core/content/engine";
import { formatDate } from "@/core/lib/time";

const ROLES: Role[] = ["owner", "admin", "operator", "member", "viewer"];

export function SettingsView() {
  const { ws, state, actions } = useDemo();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("member");
  const [msg, setMsg] = useState<string | null>(null);
  const plan = PLANS[state.plan];
  const full = state.members.length >= plan.seats;
  const personas = [...ws.directory.people.values()].filter((p) => p.personaRole);

  return (
    <div>
      <SectionTitle eyebrow="Settings" title="Team, billing & personas">
        <Button variant="danger" size="sm" onClick={actions.reset}>
          Reset sample workspace
        </Button>
      </SectionTitle>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <Card title="Team & seats" subtitle={`${state.members.length} of ${plan.seats} seats used on ${plan.name}`}>
            <ul className="divide-y divide-line">
              {state.members.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5">
                  <div>
                    <p className="text-[13px] font-medium">{m.name}</p>
                    <p className="text-[11.5px] text-muted">{m.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={m.seat === "active" ? "positive" : "warning"}>{m.seat}</Badge>
                    <select value={m.role} disabled={m.role === "owner"} onChange={(e) => actions.changeRole(m.id, e.target.value as Role)} className="rounded-md border border-line bg-surface px-2 py-1 text-xs" aria-label={`Role for ${m.name}`}>
                      {ROLES.map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                </li>
              ))}
            </ul>
            <form
              className="flex flex-wrap items-end gap-2 border-t border-line px-5 py-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (full) return setMsg(`Seat limit reached on ${plan.name}. Upgrade to invite more.`);
                if (!/^\S+@\S+\.\S+$/.test(email)) return setMsg("Enter a valid email.");
                actions.inviteMember(name || email.split("@")[0]!, email, role);
                setMsg(`Invited ${email} as ${role}.`);
                setName("");
                setEmail("");
              }}
            >
              <label className="text-xs">
                <span className="mb-1 block text-muted">Name</span>
                <input value={name} onChange={(e) => setName(e.target.value)} className="h-8 rounded-md border border-line bg-surface px-2 text-[13px]" />
              </label>
              <label className="text-xs">
                <span className="mb-1 block text-muted">Email</span>
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="sam@northstar-cloud.example" className="h-8 w-60 rounded-md border border-line bg-surface px-2 text-[13px]" />
              </label>
              <label className="text-xs">
                <span className="mb-1 block text-muted">Role</span>
                <select value={role} onChange={(e) => setRole(e.target.value as Role)} className="h-8 rounded-md border border-line bg-surface px-2 text-[13px]">
                  {ROLES.slice(1).map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </label>
              <Button type="submit" variant="primary" size="sm">
                Invite
              </Button>
              {msg && <p className={cx("w-full text-xs", msg.startsWith("Seat") ? "text-warning" : "text-ink-2")}>{msg}</p>}
            </form>
          </Card>

          <Card title="Executive personas" subtitle="Voice profile + approval mode drive the content engine">
            <ul className="divide-y divide-line">
              {personas.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                  <div>
                    <p className="text-[13px] font-medium">
                      {p.name} <span className="text-muted">· {p.title}</span>
                    </p>
                    <p className="text-[11.5px] text-muted">{PERSONA_STRATEGY[p.personaRole!].description}</p>
                  </div>
                  <Badge tone="accent">approval: human required</Badge>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Audit log" subtitle="Permission, integration, approval, replay and repair actions">
            <ul className="max-h-[360px] divide-y divide-line overflow-y-auto">
              {state.audit.length === 0 && <li className="px-5 py-4 text-xs text-muted">No actions yet. Approve a draft, invite someone, or inject a failure.</li>}
              {state.audit.map((a) => (
                <li key={a.id} className="px-5 py-2 text-[12px]">
                  <span className="font-mono text-[11px] text-muted">{formatDate(a.at)} {a.at.slice(11, 16)}</span> <span className="font-mono">{a.action}</span> <span className="text-ink-2">{a.resource}</span>
                  {a.detail && <span className="text-muted"> · {a.detail}</span>}
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <Card title="Plan" subtitle="Plan changes are recorded in the audit log">
          <ul className="space-y-2 p-4">
            {(Object.keys(PLANS) as PlanId[]).map((id) => (
              <li key={id} className={cx("rounded-xl border p-4", state.plan === id ? "border-ink shadow-[0_0_0_1px_var(--ink)]" : "border-line")}>
                <div className="flex items-center justify-between">
                  <p className="font-display text-lg font-semibold">{PLANS[id].name}</p>
                  <span className="text-xs text-muted">{PLANS[id].priceLabel}</span>
                </div>
                <p className="tnum text-[13px]">{PLANS[id].seats} seats</p>
                <ul className="mt-1 text-[11.5px] text-muted">
                  {PLANS[id].features.map((f) => (
                    <li key={f}>· {f}</li>
                  ))}
                </ul>
                <Button size="sm" className="mt-3 w-full" variant={state.plan === id ? "secondary" : "primary"} disabled={state.plan === id || PLANS[id].seats < state.members.length} onClick={() => actions.changePlan(id)}>
                  {state.plan === id ? "Current plan" : PLANS[id].seats > plan.seats ? "Upgrade" : "Downgrade"}
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
