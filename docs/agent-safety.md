# Agent safety

1. **Plan from the user, never from data.** Intent and tool sequence come only from the user's prompt. Tool outputs are not parsed for instructions.
2. **Policy is a property of the tool.** `ALLOW` (reads, internal drafts), `REQUIRE_APPROVAL` (`create_crm_note`, `schedule_draft`, `send_message`), `DENY` (`delete_integration`). No prompt can change this table.
3. **Untrusted content boundary.** Ingested free text (comments) is returned in a separate `untrustedText` field. Instruction-shaped text is flagged in the trace ("Ignored instruction-like text…") and never executed. The seed contains such a comment on purpose.
4. **Approvals are idempotent.** Each pending action has `idempotencyKey = tool:hash(input)`. Approving twice executes once; every decision writes an audit entry.
5. **Retries never duplicate side effects.** On LLM timeout the summary is retried once, then a template is used; pending actions are identical across retries (tested).
6. **Traces, not chain-of-thought.** The UI shows plan summary, tool calls, inputs, outputs, evidence IDs, durations and approval checkpoints.

## Evaluation (fixed set; results in `benchmarks/results/latest.json`)
50 warm-path (endpoint at the named company, evidence exists) · 50 account-summary (every citation exists and belongs to the account; no side effects) · 50 content-differentiation (generated drafts under threshold; planted duplicates caught) · 30 action-policy · 20 prompt-injection.
The planner is deterministic, so a perfect score verifies guarantees, not reasoning quality.
