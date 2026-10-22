# From Answering to Doing

Beyond the chatbot: how AI agents use tools, remember, and act.
A talk by **Md. Nasir Uddin Shuvo** and **Md. Aidul Islam** (Project Researchers, GPT-Lab, Tampere University) at **Crazytown Tampere, 23 October 2026**.

**Replay every demo:** https://nasiriubat.github.io/agent-presentation/

The public site runs on recorded replays only. It needs no API key, and no key is ever in this repo.

## What's inside

| Slide | Demo | Live on stage | Public site |
|---|---|---|---|
| Cold open | A plain chatbot can't book dinner | live | replay |
| Demo 1 · Watch it work | Tool map: search, calculator, file, memory, with the database rows and the agent loop lighting up | replay + live audience question | replay |
| Demo 1 · continued | When memory goes wrong: stale memory vs memory with sources and verification | replay | replay |
| Demo 2 · Watch it do your work | This week's supplier invoices matched to purchase orders, the mismatch queried, a human approves the email, nothing paid | replay | replay |
| Demo 3 · Hear it act | Voice agent plans tonight's team dinner, phones the restaurant's agent (two voices), sends the team invite (shown on the board) | live voice | replay |

Every tool-map demo has a **story column** on the left: a chat-like, plain-English account of what the agent is doing (the request, each thought, each tool call, memory, warnings, the human check, the answer). It is derived from the same events as the animation (`src/toolmap/state.js`), so live runs and replays narrate identically.

**Look:** light, paper-like slides with a dark "screen" for each demo; Inter + JetBrains Mono; [Lucide](https://lucide.dev) icons via `src/ui/icons.js` (`<i data-icon="name">` in the HTML, `icon('name')` in code). Elements with `class="rise"` glide in when a slide becomes current (`--i` sets the stagger); fragments use `fade-up`. Slides with `data-footer="off"` hide the footer (title + slide number). The event name and date live on the title slide and the last slide: change both when presenting elsewhere.

The agent loop is plain code (`server/agent.js`), with no framework. Models: `gpt-6-luna` (agent, negotiation), `gpt-realtime-2.1` (voice), `gpt-4o-mini-tts` (negotiation voices).

## Speaker script

**`SCRIPT.md`** at the repo root is the full script: who says what on every slide, minute marks, and the cues. Share that file with your co-speaker. It is generated from the speaker notes inside `index.html` by `npm run script` (the build runs it too), so edit the notes in the slides, then regenerate. The same notes are also readable on a phone at `http://localhost:5173/?notes` while presenting.

## Stage setup (presentation laptop)

```bash
npm install
cp .env.example .env    # add OPENAI_API_KEY
npm run stage           # web on http://localhost:5173, API on http://localhost:8787
```

1. Open **http://localhost:5173/preflight.html**: every automatic check should be green. Then test the mic and the speakers with the buttons.
2. Open **http://localhost:5173/**. The top-right badge says **● LIVE** (click it to force **▶ REPLAY** if the network fails).
3. Speaker notes: open **http://localhost:5173/?notes** on a phone. Keep keyboard/clicker focus on the **main** deck window: reveal's speaker view (S) may let a press skip a running demo, so test that in rehearsal before relying on it.
4. If the finale ever gets stuck, press → twice quickly to leave the slide.

Keys: → / Space / PageDown = next (on a demo slide this steps the demo; the slide advances when the demo is done), ← / PageUp = back. Clickers work. Every demo has ▶ (play, then pause), ↺ (restart) and `{ }` (the raw tool calls). Leaving a demo slide pauses it and keeps its state. A stray ← costs nothing: you land on the previous slide, and the next → simply moves forward again (on a demo slide too, unless you click one of its buttons). Only ↺ starts a demo over.


### Re-recording replays
- **Demo 1:** in LIVE mode ask a question, then the ⤓ button downloads `live-run.json` → save as `public/replays/demo1-task1.json`.
- **Finale:** open `http://localhost:5173/dev/finale.html`, press ⏺ Record, 🎙️ Connect live, do the demo, ⏹ Stop & download → put `events.json` and `audio.webm` in `public/replays/finale/`.
- Commit and push: GitHub Actions publishes the site.

### If time runs short (cut in this order)
the frameworks slide (keep the courses one) → the live audience question in Demo 1 → the "remember…" moment in the finale → the "how we got here" timeline → the "what counts as a tool" slide.

## Development

```bash
npm test          # node --test
npm run dev       # web only (replay mode)
npm run build     # public build (VITE_PUBLIC=1, base /agent-presentation/)
```

Dev harness pages: `/dev/toolmap.html`, `/dev/demos.html`, `/dev/finale.html`.

Design and plan: `docs/superpowers/specs/2026-10-19-agent-presentation-design.md`, `docs/superpowers/plans/2026-10-19-agent-presentation.md`. The 22 Oct polish pass (light theme, story column, phone fix, motion): `docs/superpowers/specs/2026-10-22-presentation-polish-design.md`.
