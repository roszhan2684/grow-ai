# Data model

## Postgres (system of record)
See `supabase/migrations/0001_core_schema.sql`. Key tables: `organizations, users, organization_members (role, seat_status), personas, companies, people (identity_confidence, handles), integrations (status, cursor), oauth_tokens (reference only), raw_events (append-only; unique (org, provider, provider_event_id)), normalized_events, campaigns, content_drafts, approvals, opportunities, attribution_runs, attribution_touches (weight ∈ [0,1]), agent_runs, agent_tool_calls, jobs (unique idempotency_key), audit_events`.

## Graph (derived)
| Input event | Projection | Strength increment |
| --- | --- | --- |
| person_upserted | Person/TeamMember −WORKS_AT→ Company | 1 |
| person_changed_company | old WORKS_AT gets `ended_at`; new WORKS_AT | 1 |
| known_connection | Person −KNOWS→ Person | 4 |
| crm_contact_owner | TeamMember −CONNECTED_TO→ Person | 3 |
| post_published | TeamMember −POSTED→ Post −ABOUT_TOPIC→ Topic | 1 |
| person_liked_post | Person −ENGAGED_WITH→ Post | 1 |
| person_commented_post | COMMENTED_ON (+3) and ENGAGED_WITH (+2) | 3 / 2 |
| team_replied_comment | TeamMember −CONNECTED_TO→ commenter | 2 |
| introduction_made | introducer −KNOWS→ introduced (+3); recipient −KNOWS→ introduced (+6) | 3 / 6 |
| meeting_created | Person −MET_WITH→ TeamMember; Company −MET_WITH→ TeamMember | 5 |
| opportunity_opened | Company −CREATED_OPPORTUNITY→ Opportunity | 1 |
| revenue_closed_won | Opportunity −ATTRIBUTED_TO→ RevenueEvent | 1 |
| crm_note_created | TeamMember −CONNECTED_TO→ Person | 1 |

`strength = quantize(1 − e^(−raw/6))`. For warm paths, all KNOWS/CONNECTED_TO/MET_WITH edges between the same two people collapse into one relationship (summed raw strength, merged sources and evidence).

## Warmth index (accounts list)
`0.5·min(1, interactions_14d/8) + 0.3·best_path_score + 0.2·min(1, people_engaged_30d/3)`, scaled to 0–100. A transparent ranking heuristic, not a prediction.

## Demo seed
`src/core/seed/generate.ts` (seed `20261001`): Northstar Cloud (CEO, VP Sales, Head of Marketing), an advisor, 12 target accounts, 45 people, 30 posts, 120 engagements, 8 meetings, 5 opportunities (2 closed won), 6 duplicate deliveries, 1 invalid payload, 1 ambiguous identity, 1 champion who changes company, 1 prompt-injection comment. Event times span 90 days before the fixed demo clock (2026-10-01).
