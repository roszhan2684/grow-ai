# Hyperframes Composition Brief: GROW AI

## Objective
A 24.2s polished launch brag for GROW AI, voice-led, showing the real product's receipts.

## Output
- Composition: `brag-output/composition/` · Render: `brag-output/brag.mp4` · 1920x1080 landscape · 24.2s

## Source Material
- Project root: `/Users/roszhanraj/GrowAI/grow-ai` (Next.js app + site)
- Files read: `src/app/(site)/page.tsx`, `src/views/{Account,Agent,Attribution,Jobs}.tsx`, `src/app/globals.css`, README
- Real engine data exported to `composition/assets/data.js` (graph node positions from the same d3-force layout, Acme attribution weights, checksum `0a49fde1791b53`)
- Verbatim copy: "Turn B2B relationships into a system." · "Paused. Nothing was sent." · "Approve & execute once" · "Credit assignment, not causal proof." · "Synthetic data"

## Creative Direction
- Tone: polished · direction: confident product film with receipts
- Hook: graph builds itself + "Your pipeline remembers every handshake."
- Outro: logo + "Turn B2B relationships into a system."
- Avoid: generic SaaS language, sparkles/robots, fake customers or revenue, any third-party company names

## Visual Identity
- Canvas #f8f8f5, card #ffffff, line #e2e4de, ink #0f172a, secondary #334155, muted #64748b
- Accent #0f766e / soft #e3f2ef; graph team #0d9488, prospect #2a78d6; console #0b1220 with #99f6e4
- Fonts (local woff2): Bricolage Grotesque (display), Inter (body), JetBrains Mono (mono)

## Storyboard
See `brag-plan.md`. Scenes: Hook 0–3.9 · Warm path 3.5–8.84 · Agent 8.64–12.75 · Attribution 12.35–16.45 · Break it 16.05–20.05 · Outro 19.65–24.2 (0.4s overlaps = soft crossfades).

## Audio
- Bed: `assets/music/bed.mp3` (vol-12, first 25s), automation lane fades in, ducks to ~0.14 under narration, fades out
- Voice: `assets/vo/vo-1..6.wav` (Kokoro am_michael, 1.15x, silence-trimmed) at 0.35, 4.0, 9.1, 12.75, 16.5, 20.1
- Cue locks: S3 cut at 8.74 (strong), approval row at 10.93 (strong), checksum "=" at 18.56 (strong)
- Audio-reactive: subtle; normalized RMS (`assets/rms.js`) breathes the teal glow behind the hero graph and the logo
- SFX (sparse): drop_001 (path collapse), click_003 (approve), switch_007 (attribution toggle), rollover2 (chip flips, 2 accents), bong_001 (checksum), impactBell_heavy_000 (logo, low)
