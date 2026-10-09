# Attribution

**Attribution assigns credit across observed touches. It is not causal proof.** Every output says so.

## Eligible touches
Events for the opportunity's company of type like, comment, team reply, introduction, meeting or CRM note, that occurred **before** the opportunity opened and within 90 days, with identity confidence ≥ 0.5. Everything else within 30 days after opening is listed as *excluded with a reason*.

## Models
| Model | Weighting |
| --- | --- |
| First touch | 100% to earliest |
| Last touch | 100% to latest |
| Linear | 1/n |
| Time decay | 2^(−days_before_open / 7), normalized |
| Position based | 40% first, 40% last, 20% shared by the middle |
| Graph assisted | event_type_weight × recency_decay × relationship_strength × identity_confidence × source_reliability, normalized |

Factor values: event type (like 0.4, comment 1.0, reply 0.8, intro 1.6, meeting 1.4, CRM note 0.5); recency `e^(−days/21)`; relationship strength = strongest direct relationship to our team **in the as-of graph** (floor 0.25); source reliability (manual 1.0, CSV/HubSpot 0.95, Slack 0.85, social 0.75). These are hand-set heuristics, not a learned model.

## Contract (tested)
- Weights sum to 1 (to 1e-9) for every opportunity × model.
- No eligible touch occurs after the open date.
- Graph-assisted gives the Acme advisor intro more credit than last touch does.

## Removed: look-ahead leakage
The first version read relationship strength from the current graph, so a post-open meeting inflated pre-open touches. Each opportunity now scores against `projectGraph(events up to openedAt)`.
