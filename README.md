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
| When memory goes wrong | Stale memory vs memory with sources and verification | replay | replay |
| Demo 2 · Watch it get fooled | Prompt injection leaks (fake) keys; then guarded with an untrusted-data label + human approval | replay | replay |
| Demo 3 · Finale | Voice agent plans tonight's team dinner, phones the restaurant's agent (two voices), texts the speaker's phone | live voice | replay |

The agent loop is plain code (`server/agent.js`), with no framework. Models: `gpt-6-luna` (agent, negotiation), `gpt-realtime-2.1` (voice), `gpt-4o-mini-tts` (negotiation voices).

## Stage setup (presentation laptop)

```bash
npm install
cp .env.example .env    # add OPENAI_API_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID_NASIR, TELEGRAM_CHAT_ID_AIDUL
npm run stage           # web on http://localhost:5173, API on http://localhost:8787
```

1. Open **http://localhost:5173/preflight.html**: every automatic check should be green. Then test Telegram, the mic and the speakers with the buttons.
2. Open **http://localhost:5173/**. The top-right badge says **● LIVE** (click it to force **▶ REPLAY** if the network fails). **📱** picks whose phone buzzes.
3. Speaker notes: press **S** for reveal's speaker view, or open **http://localhost:5173/?notes** on a phone.

Keys: → / Space / PageDown = next (on a demo slide this steps the demo; the slide advances when the demo is done), ← / PageUp = back. Clickers work.

### Telegram bot (one-time)
1. In Telegram, message **@BotFather** → `/newbot` → copy the token into `TELEGRAM_BOT_TOKEN`.
2. Both speakers send the new bot any message.
3. `curl "https://api.telegram.org/bot<TOKEN>/getUpdates"` → copy each `chat.id` into `TELEGRAM_CHAT_ID_NASIR` / `TELEGRAM_CHAT_ID_AIDUL`.
4. Preflight → "Send test".

### Re-recording replays
- **Demo 1:** in LIVE mode ask a question, then the ⤓ button downloads `live-run.json` → save as `public/replays/demo1-task1.json`.
- **Finale:** open `http://localhost:5173/dev/finale.html`, press ⏺ Record, 🎙️ Connect live, do the demo, ⏹ Stop & download → put `events.json` and `audio.webm` in `public/replays/finale/`.
- Commit and push: GitHub Actions publishes the site.

### If time runs short (cut in this order)
Voice Q&A → live audience question in Demo 1 → the "remember…" moment in the finale → phone polish.

## Development

```bash
npm test          # node --test
npm run dev       # web only (replay mode)
npm run build     # public build (VITE_PUBLIC=1, base /agent-presentation/)
```

Dev harness pages: `/dev/toolmap.html`, `/dev/demos.html`, `/dev/finale.html`.

Design and plan: `docs/superpowers/specs/2026-10-19-agent-presentation-design.md`, `docs/superpowers/plans/2026-10-19-agent-presentation.md`.
