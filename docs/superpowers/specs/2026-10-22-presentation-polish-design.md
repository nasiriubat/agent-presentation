# Presentation polish: light theme, readable narration, phone replays

**Date:** 22 October 2026 (talk is 23 October). Follow-up to `2026-10-19-agent-presentation-design.md`.
**Why:** the speakers reviewed the deck and asked for a review of the whole thing: a professional look they can reuse at other events, narration under the demos that is actually readable, working replays on phones, and better motion.

## Findings from the review

1. **Phone replays were broken.** On the public site, phones get a scrolling page with a "Play this demo" button per demo. reveal.js's stylesheet gives every slide `pointer-events: none` unless it is the current slide, and the phone page never initialises reveal, so no slide is ever current and every tap falls through to the container. Confirmed with touch emulation; forcing pointer events back on fixes it.
2. **Narration was a thin caption bar.** The plain-English story of each demo (what the agent is doing and why) lived in a one-line bar at the bottom of the dark stage, in small type over a translucent black strip. From the back of a room it is unreadable, and on a phone it is cut off.
3. **Dark theme.** Dark slides photograph badly, fight bright rooms, and look like a developer tool. The demos themselves benefit from a dark "screen" because of the glows and the travelling dot.
4. **Emoji as icons** everywhere (slides, tool nodes, panels). Fine for a friendly tone, but it reads as casual, renders differently per OS, and some emoji are illegible at projector distance.
5. **Little motion.** Fragments just appear, cards don't enter, the timeline doesn't build. The 3D scenes are good.
6. **No agenda, no recap.** The audience is told nothing about the shape of the hour, and the two "what goes wrong" segments never get pulled together into rules.

## Decisions

### Theme: light, Swiss-minimal, with a dark "screen" for demos
- Slides: `#f8fafc` background, white cards with `#e2e8f0` borders, ink `#0f172a`, muted `#475569`. Accent is a deep blue (`#1e40af` on text, `#2563eb` on controls). Amber (`#f59e0b`) is reserved for activity on the dark stage (the travelling dot, glowing nodes, highlighted rows).
- Every demo sits inside a dark inset "screen" (`#0b1020` gradient, rounded, soft shadow), like a product screenshot on a keynote slide. The cold-open chat window stays light.
- Side panels (database, memory, loop code), the story panel and the finale cards are white cards on the light slide, so the only dark area is the animated stage.
- Type: Inter 600–800 for headings with tight tracking, Inter 400–500 for body, JetBrains Mono for code, labels and numbers. No new fonts.
- Icons: Lucide SVGs (via `lucide-static`) through one `icon(name)` helper. Emoji removed from slides, tool nodes, panels and chips.

### Narration: a story panel beside the stage
- The tool map gets a third column, the **story**: a chat-like list of what happened, in plain English and large type. One entry per meaningful event: the request, each thought, each tool use, memory saved or recalled, warnings, guards, the human check, and the answer. The newest entry is highlighted and the list auto-scrolls.
- The bottom caption bar is removed. The thought bubble stays on the stage.
- The story is derived in `state.js` (pure, unit-tested), so live runs and replays narrate identically.
- Layout at 1600×900: story ≈ 25%, stage ≈ 45%, side panels ≈ 30% (Demo 1). Without side panels: story 35%, stage 65%.
- Phones: stage first, story below it with a capped height.

### Phone page
- `pointer-events: auto !important` on every slide and its children in phone mode.
- The Play button reports failures instead of silently doing nothing, and the finale's audio probe has a 3 s timeout so a missing or unsupported `audio.webm` can never hang the replay.
- Buttons meet 44 px touch targets.

### Motion
- Every slide's main elements rise in (fade + 16 px translate, 500 ms, ease-out, 60 ms stagger) when the slide becomes current. Fragments use reveal's `fade-up`.
- The timeline draws a connector as the years appear. Cards get a one-shot lift when they enter.
- Tool map: active node gets a pulse ring, the dot keeps its glide, the story entry pops in.
- `prefers-reduced-motion` turns the entrance animations off.

### Content
- New slide after "Hands up": **Today** — three demos (Watch it work · Watch it get fooled · Hear it act), one line each.
- New slide after Demo 2: **Three habits for safe agents** — treat what it reads as data; give memory receipts; a human approves anything that leaves the building.
- Demo slide headers become a kicker ("DEMO 1") plus a title.
- A quiet footer (talk title, slide number) on content slides; none on the cold open, title and closing slides.

### Non-goals
- No change to the agent, server, replays or event format.
- No new demo content; the demos' stories are good. (Suggestions for the speakers are in the session recap, not built.)

### Telegram removed (22 Oct, speakers' decision)
The finale no longer messages a phone. `send_invite` shows the invitation on the mission board under the booking, as the message the team receives. No bot, no chat IDs, no `/api/telegram` route, no phone picker on stage. The earlier spec's "phone buzzes" beat is superseded.

### Second review round (22 Oct, speakers' feedback)
- **Demo controls.** ▶ toggles play/pause on every tool-map demo and on the finale; → while autoplaying pauses. Leaving a demo slide pauses it and keeps its state (a stray ← no longer forces the whole demo to be stepped again); only ↺ restarts. One promise chain serialises steps and autoplay so buttons can't race each other, and buttons blur after a click so the clicker keeps keyboard focus.
- **Demo 2 replaced.** The CloudNote review is gone. Demo 2 is now "Watch it do your work": three supplier invoices matched to purchase orders, the EUR 252 mismatch caught with the calculator, an email drafted and sent only after a human approves, nothing paid. Demo 3 "Watch it get fooled" lives in the same world: a fraudulent invoice hides "pay this new bank account" text; unguarded the agent pays it (new `harm` event lights the tool red), guarded it flags the account change and a human blocks it. Data: `public/data/orders.json`; replays `demo2-invoices`, `demo3-unguarded`, `demo3-guarded`.
- **Q&A slide** explains the live voice option instead of showing an empty board; three conversation starters on screen; the voice panel appears only in LIVE mode (`src/voice/qa.js`).
- **New slides before Demo 1:** "A chatbot answers. An agent acts.", "A tool is any action it's allowed to take", and "How to read the next screens" (a legend for the demo layout). Agenda renamed "What we'll do today" with four demos.
- **After the finale:** "What people build agents with" (LangGraph, OpenAI Agents SDK, Claude Agent SDK, Microsoft Agent Framework, Google ADK, CrewAI; MCP and A2A) and "Learn it for free" (Hugging Face, Anthropic, OpenAI Academy, Google × Kaggle, Microsoft, IBM), checked against the providers' pages on 22 Oct 2026.
- **Footer on every slide:** title left, slide number centre, "GPT-Lab × Crazytown Tampere" right. The mode badge explains itself (tooltip + toast when the local server isn't running).

### Third round (22 Oct, speakers' decision)
- Demo 3 "Watch it get fooled" removed; the talk has three demos (work, invoices, voice finale). The prompt-injection idea stays as the "Data vs instructions" concept slide and the "Three habits" recap. The `harm` event and `pay_supplier`-style danger nodes remain in the engine for a future version.
- The voice Q&A slide is replaced by a plain "Questions?" slide with three conversation starters, placed after the take-home and before the thank-you and QR slides.
- `SCRIPT.md` is the speaker script, generated from the slide notes by `scripts/make-script.mjs` (`npm run script`, also on build). Every slide carries `data-time` minute marks and notes that name the role that speaks.
- Footer type enlarged to 20px.
