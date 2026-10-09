/** CSV CRM connector (fully working): RFC 4180-style parsing → contact_row raw events. */
import { z } from "zod";
import type { RawEvent } from "../contracts";

export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  row.push(field);
  if (row.some((f) => f.trim() !== "")) rows.push(row);
  const [header, ...body] = rows;
  if (!header) return [];
  const keys = header.map((h) => h.trim().toLowerCase());
  return body.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? "").trim()])));
}

const Row = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  title: z.string().default(""),
  company_domain: z.string().min(3),
  seniority: z.enum(["c_level", "vp", "director", "manager", "ic"]).default("ic"),
});

export const CSV_COLUMNS = ["email", "name", "title", "company_domain", "seniority"] as const;

export function csvToRawEvents(rows: Record<string, string>[], receivedAt: string) {
  const events: RawEvent[] = [];
  const errors: string[] = [];
  rows.forEach((r, i) => {
    const parsed = Row.safeParse({ ...r, seniority: r.seniority || undefined });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      errors.push(`line ${i + 2}: ${issue?.path.join(".")} — ${issue?.message}`);
      return;
    }
    events.push({ provider: "csv_crm", providerEventId: `contact:${parsed.data.email.toLowerCase()}`, kind: "contact_row", payload: parsed.data, receivedAt });
  });
  return { events, errors };
}
