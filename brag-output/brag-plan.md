# Brag Plan: GROW AI

## What is this app?
A relationship-intelligence product for B2B growth: it turns posts, CRM records, Slack intros and meetings into one event-sourced graph, finds the warmest path into an account, lets a policy-gated agent recommend (and wait for approval on) next actions, and explains attribution, with every number traceable to events.

## The angle
"Evidence-first brag." Most B2B AI launch videos show sparkles and big claims. This one shows receipts: the graph replaying itself, a path score climbing 0.45 → 0.87 because of one real intro, an agent pausing for approval, credit moving from the last click to the relationship, and a checksum that doesn't change when you break things. Confidence comes from specificity, not adjectives.

## Hook (first 2-3 seconds)
Dark-on-warm-white: the relationship graph builds itself node by node while an "events projected" counter races 0 → 253. Big line lands over it: **"Your pipeline remembers every handshake."** (VO adds: "Your tools don't.")

## Key moments (the middle)
- The Acme warm path: "14 days ago: Maya Okafor → Lena Fischer → Tomas Lindqvist · 0.45" collapses into "Today: Maya Okafor → Tomas Lindqvist · 0.87" with the teal path line drawing in.
- The agent trace: tool calls tick in one by one (✓ get_people_at_company, ✓ get_account_timeline, ✓ find_warm_paths) then **create_crm_note · ⏸ APPROVAL REQUIRED**; a cursor clicks "Approve & execute once" → "Executed once."
- Attribution toggle: Last touch → Graph assisted. Bars re-flow; "Lena Fischer introduced Tomas Lindqvist" rises to the top. Caption: "Not causal proof."
- Break it: failure chips (429 · 401 · ×5 webhook · Neo4j down · LLM timeout) each flip to ✓, then the checksum `0a49fde1791b53` appears twice, labelled Node and Browser, with "=".

## Outro / punchline
GROW AI logo mark + wordmark. "Turn B2B relationships into a system." Small: "Synthetic data. Real engine. grow-ai-ten.vercel.app"

## User flow worth showing
Open account → see the warm path and its evidence → ask the agent → approve the gated action → compare attribution. (All recreated from the real app screens in `src/views/Account.tsx`, `Agent.tsx`, `Attribution.tsx`, `Jobs.tsx`.)

## Tone
- Preset: polished
- Creative direction: "confident product film with receipts": premium, calm motion, crisp mono details, the brag carried by the narrator and the evidence
- Interpretation: fewer, cleaner moves; 0.5-0.7s soft crossfades; every number holds long enough to read; no bounce, no sparkle.

## Format: landscape — 1920x1080
## Duration: 24.2s (voice-led)

## Visual identity (from the project)
- Background: #f8f8f5 (canvas), cards #ffffff, line #e2e4de
- Accent: #0f766e (teal), soft #e3f2ef; graph series team #0d9488, prospect #2a78d6, deal #eb6834
- Text: #0f172a ink, #334155 secondary, #64748b muted
- Dark panel (agent/break-it console): #0b1220 with #99f6e4 mint accents
- Display font: Bricolage Grotesque (600-800) · Body: Inter · Mono: JetBrains Mono
- Strongest visual element: the relationship graph with the teal warm-path highlight

## Share copy (draft)
GROW AI: a relationship graph for B2B growth that shows its receipts: warm paths with evidence, an agent that asks before it acts, attribution that admits it isn't causal, and a checksum that survives being broken on purpose.

## Audio direction
- Role: warm bed under a confident male narrator (Kokoro am_michael)
- Music: happy-beats-business-moves-vol-12 (polished/steady, 110 BPM)
- Music treatment: fade in 0.6s, sit ~0.32, duck to ~0.13 under each VO line, swell back between lines, fade out over the last 1.2s
- Music cue guidance: preset `cues/happy-beats-business-moves-vol-12-by-ende-dot-app.music-cues.json`. Strong cues: 8.74s (S2→S3 cut), 22.93s (outro tagline lands). Beat grid ~0.546s; agent tool rows on every other beat from 9.83s.
- Audio-reactive treatment: subtle; music RMS breathes the teal glow behind the graph/path and logo. No waveform visuals.
- SFX posture: sparse (polished): soft drop on path collapse, a click on "Approve", light ticks on failure chips flipping, one restrained bell on the logo
- Audio-coupled moments: counter race (no SFX, VO carries), agent rows (soft ticks on 1st and last), approve click, chips flipping, logo
- Restraint rule: SFX never step on narration consonants; nothing louder than the voice

## Voiceover script
1. (0.35s) "Your pipeline remembers every handshake. Your tools don't."
2. (4.0s) "GROW AI maps every touch into one graph, and finds the warmest way in."
3. (9.1s) "Its agent cites the evidence, and asks before it acts."
4. (12.75s) "Attribution that credits the relationship, not the last click."
5. (16.5s) "We broke it on purpose. Same checksum, every replay."
6. (20.1s) "GROW AI. Turn B2B relationships into a system."

## Storyboard

### Scene 1 — Hook: the graph builds — 0.0–3.8s
Graph nodes/edges draw in over the canvas; "253 events projected" counter races; headline "Your pipeline remembers every handshake." settles by 1.2s and holds.
Sequential/interaction: yes — edges appear in a staggered sweep
Audio intent: music fades in; narrator starts at 0.35s
Transition mood: soft → Scene 2

### Scene 2 — Warm path — 3.8–8.74s
Account card "Acme Robotics · warming · 14 interactions from 5 people". Path evolution: row "14 DAYS AGO — Maya Okafor → Lena Fischer → Tomas Lindqvist · 0.45" holds ~1.5s, then the middle node folds away and the row becomes "TODAY — Maya Okafor → Tomas Lindqvist · 0.87" with the score counting up and a teal line drawing between avatars. Footnote: "Evidence: Lena Fischer introduced Tomas Lindqvist · slack".
Sequential/interaction: yes — path collapse + score count-up
Audio intent: soft drop as the path collapses
Transition mood: clean cut on the 8.74s strong cue → Scene 3

### Scene 3 — Agent shows its work — 8.74–12.6s
Dark console. Prompt "$ What should we do next with Acme Robotics?". Rows tick in on every other beat: three ✓ ALLOW rows, then "create_crm_note — ⏸ REQUIRE_APPROVAL · Paused. Nothing was sent." Cursor clicks "Approve & execute once" → badge "Executed once".
Sequential/interaction: yes — rows + simulated click
Audio intent: light ticks, crisp click
Transition mood: soft → Scene 4

### Scene 4 — Attribution — 12.6–16.3s
Card "Acme Robotics · opportunity credit" with a segmented toggle. Starts on Last touch (one bar 100%), toggle flips to Graph assisted, bars re-flow; "Lena Fischer introduced Tomas Lindqvist" rises to the top. Footer: "Credit assignment, not causal proof."
Sequential/interaction: yes — toggle flip
Transition mood: soft → Scene 5

### Scene 5 — Break it — 16.3–19.9s
Five failure chips (429 rate limit · 401 revoked token · ×5 duplicate webhook · Neo4j outage · LLM timeout) flip to ✓ in sequence; then "graph checksum" with two rows "Node 0a49fde1791b53" / "Browser 0a49fde1791b53" and a teal "=".
Sequential/interaction: yes — chips flip
Transition mood: soft → Scene 6

### Scene 6 — Outro — 19.9–24.2s
Logo mark + "GROW AI" wordmark; tagline "Turn B2B relationships into a system." lands at ~22.93s strong cue; small mono line "Synthetic data · real engine · grow-ai-ten.vercel.app".
Audio intent: restrained bell on logo, music fades out

**Music mood for this video:** polished, steady
**Audio summary:** a steady business-y bed ducks under a calm, confident narrator; a handful of soft UI sounds mark the moments the product acts, and one bell closes it.
