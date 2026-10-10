import type { Metadata } from "next";
import { CtaBand, PageHero } from "@/components/site/SiteChrome";

export const metadata: Metadata = { title: "Security", description: "How GROW AI protects your data and keeps people in control of AI actions." };

const PX = "px-5 md:px-10 xl:px-16";

const CONTROLS: [string, string][] = [
  ["Human approval for AI actions", "CRM notes, scheduled posts and outbound messages always pause for a person. Approved actions run exactly once."],
  ["Policy per action, not per prompt", "What the agent may do is fixed for each action. Instructions hidden in imported content are treated as data and flagged."],
  ["Encrypted credentials", "Integration tokens are encrypted at rest and stored separately from their metadata. Tokens are redacted from every log."],
  ["Verified webhooks", "Incoming webhooks are signature-checked, time-boxed and protected against replay."],
  ["Secure sign-in to integrations", "OAuth connections use state and PKCE, with verifiers kept server-side."],
  ["Roles and seats", "Owner, admin, operator, member and viewer roles control who can approve, connect and configure."],
  ["Audit log", "Approvals, permission changes, integration changes, repairs and replays are recorded with who and when."],
  ["Organization-scoped data model", "Every record belongs to an organization, and the graph is partitioned by organization."],
];

export default function Page() {
  return (
    <>
      <PageHero eyebrow="Security" title="Your relationships are your advantage. We treat them that way.">
        GROW AI is designed so people stay in control of AI, credentials stay protected, and every action leaves a trail.
      </PageHero>
      <section className="w-full">
        <div className="grid w-full gap-px bg-line md:grid-cols-2">
          {CONTROLS.map(([t, d]) => (
            <div key={t} className={`bg-canvas ${PX} py-12`}>
              <h2 className="font-display text-[24px] font-semibold">{t}</h2>
              <p className="mt-2 max-w-xl text-[15.5px] leading-relaxed text-ink-2">{d}</p>
            </div>
          ))}
        </div>
      </section>
      <CtaBand title="Have a security questionnaire?" body="Book a call and we'll walk your team through how GROW AI handles data, access and AI actions." />
    </>
  );
}
