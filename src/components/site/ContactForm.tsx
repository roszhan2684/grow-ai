"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

const SALES_EMAIL = process.env.NEXT_PUBLIC_SALES_EMAIL ?? "";

export function ContactForm() {
  const plan = useSearchParams().get("plan") ?? "";
  const [state, setState] = useState<"idle" | "sending" | "sent" | "fallback" | "error">("idle");
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<Record<string, string>>({});

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string, string>;
    setDraft(data);
    setState("sending");
    const r = await fetch("/api/contact", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...data, plan }) }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    if (r?.ok) return setState("sent");
    if (r?.status === 400) {
      setError(String(j.error ?? "Please check the form."));
      return setState("error");
    }
    setState("fallback");
  };

  if (state === "sent")
    return (
      <div className="rounded-2xl border border-line bg-surface p-10">
        <p className="font-display text-[32px] font-bold">Thanks, we&apos;ll be in touch.</p>
        <p className="mt-3 text-[16px] text-ink-2">We&apos;ll reach out within one business day to schedule your walkthrough.</p>
      </div>
    );

  if (state === "fallback") {
    const body = encodeURIComponent(`Name: ${draft.name}\nCompany: ${draft.company}\nRole: ${draft.role}\nTeam size: ${draft.teamSize}\nPlan: ${plan}\n\n${draft.message ?? ""}`);
    return (
      <div className="rounded-2xl border border-line bg-surface p-10">
        <p className="font-display text-[28px] font-bold">Almost there.</p>
        <p className="mt-3 text-[16px] text-ink-2">We couldn&apos;t submit the form automatically. Send your request by email and we&apos;ll get right back to you.</p>
        {SALES_EMAIL && (
          <a href={`mailto:${SALES_EMAIL}?subject=${encodeURIComponent("GROW AI demo request")}&body=${body}`} className="mt-6 inline-block rounded-xl bg-ink px-6 py-3.5 text-[15px] font-semibold text-white">
            Email {SALES_EMAIL}
          </a>
        )}
      </div>
    );
  }

  const field = "w-full rounded-xl border border-line-strong bg-surface px-4 py-3 text-[15px] outline-none focus:border-accent";
  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <label className="text-[14px] font-medium">
        Full name
        <input name="name" required autoComplete="name" className={`mt-1.5 ${field}`} />
      </label>
      <label className="text-[14px] font-medium">
        Work email
        <input name="email" type="email" required autoComplete="email" className={`mt-1.5 ${field}`} />
      </label>
      <label className="text-[14px] font-medium">
        Company
        <input name="company" required autoComplete="organization" className={`mt-1.5 ${field}`} />
      </label>
      <label className="text-[14px] font-medium">
        Role
        <input name="role" autoComplete="organization-title" className={`mt-1.5 ${field}`} />
      </label>
      <label className="text-[14px] font-medium sm:col-span-2">
        Team size
        <select name="teamSize" className={`mt-1.5 ${field}`} defaultValue="">
          <option value="" disabled>
            Select…
          </option>
          <option>1–10</option>
          <option>11–50</option>
          <option>51–200</option>
          <option>200+</option>
        </select>
      </label>
      <label className="text-[14px] font-medium sm:col-span-2">
        What would you like to see?
        <textarea name="message" rows={4} className={`mt-1.5 ${field}`} />
      </label>
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      {state === "error" && <p className="text-[14px] text-danger sm:col-span-2">{error}</p>}
      <button type="submit" disabled={state === "sending"} className="rounded-xl bg-ink px-6 py-4 text-[15px] font-semibold text-white hover:bg-[#1e293b] disabled:opacity-60 sm:col-span-2">
        {state === "sending" ? "Sending…" : "Book my demo"}
      </button>
    </form>
  );
}
