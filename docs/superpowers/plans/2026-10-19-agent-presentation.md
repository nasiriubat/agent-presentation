# Agent Presentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A browser presentation for the 23 Oct 2026 Crazytown talk with three animated agent demos (tool map, prompt injection, live voice dinner booking with agent-to-agent negotiation and a Telegram buzz), runnable live on stage from a local server and as replays on a public GitHub Pages site.

**Architecture:** A static Vite site (three.js/reveal.js deck + vanilla JS/CSS demo components) that consumes a single **event stream format**. Events come either from a local Node/Express server (live: OpenAI Responses API agent loop, Realtime WebRTC voice, negotiation, Telegram, weather) or from recorded JSON replays. The public build has no server and runs replays only. Keys live only in the local `.env`.

**Tech Stack:** Node 20+, Express, Vite 5 (vanilla), reveal.js 5, `qrcode`, `node --test`, OpenAI APIs: Responses (`gpt-6-luna`), Realtime WebRTC (`gpt-realtime-2.1`), TTS (`gpt-4o-mini-tts`), transcription (`gpt-4o-mini-transcribe`); Open-Meteo for weather; Telegram Bot API; GitHub Actions → GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-10-19-agent-presentation-design.md`

## Global Constraints

- No API key, bot token or chat ID in git or in the built site. Secrets only in `.env` (git-ignored). `.env.example` lists the names.
- Every demo (cold open, Demo 1, memory, Demo 2, finale) has a replay that runs with no network and no key.
- Public site = replay only; built with `VITE_PUBLIC=1`, base path `/agent-presentation/`, repo `nasiriubat/agent-presentation`.
- All data is fictional: company "Brightloop", restaurants invented, `secrets.txt` says "FAKE demo credentials".
- Text-only credits: "Organised by GPT-Lab, Tampere University · Sponsored by Crazytown Tampere".
- Wording: "dinner for my team **tonight**" (23 Oct 2026 is a Friday) in the cold open and the finale.
- Negotiation: restaurant offers 19:00 terrace only or 20:30 indoors, vegetarian available; max 4 turns per agent; fallback script if no agreement, error, or >40 s of generation.
- Voice: always-listening (`semantic_vad`), mic muted while the assistant or the negotiation audio plays, visible mute button.
- Navigation keys: → Space PageDown ↓ = next; ← PageUp ↑ = previous. Inside an armed demo, next = step the demo.
- Dark theme, 16:9, readable from the back; layouts must work at 390 px width (phone).
- Roles in notes: "Theory speaker" / "Demo speaker". Speaker data from `speaker/info.txt`.
- Commit after every task. Conventional commit messages. Attribution line per the session's reminder.

## Review Focus

1. Local server unreachable (public site, Wi-Fi down): every live control must fall back to replay within 1.5 s, never hang. → test in Task 2 (`api.health` timeout) and Task 10.
2. Negotiation that never converges, errors, or runs long: the fallback script must take over with no visible gap, and the booking card must still appear. → tests in Task 5.
3. Telegram or weather failure during the finale: the demo continues (booking card shows "invite not delivered"; weather uses the cached forecast with a "cached" marker). → tests in Tasks 4 and 7.
4. Realtime token/mic failure on stage: a clear on-screen error with a one-click "Use replay" button, not a silent dead mic. → Task 7 manual check + Task 10.
5. Audience task in Demo 1 that the agent can't answer from the notes (e.g. "what's the CEO's salary?"): the loop must stop with an honest "not in the notes" answer within `maxSteps`, not loop. → test in Task 3.

---

## File structure

```
(project root = repo)
package.json, vite.config.js, .gitignore, .env.example, README.md
index.html            reveal deck (all slides, notes as <aside class="notes">)
preflight.html        stage checklist page
src/
  core/events.js      event types + validateEvent()
  core/player.js      EventPlayer (step/autoplay over timed events)
  core/api.js         client for local server + health probe
  core/modes.js       isPublic(), liveAvailable()
  slides/deck.js      reveal init, key routing to armed demo, ?notes view
  slides/slides.css
  toolmap/toolmap.js  ToolMap component (stage, nodes, dot, bubble, caption) + reduceState()
  toolmap/panels.js   DbPanel, MemoryPanel, CodePanel, LogPanel
  toolmap/toolmap.css
  demos/coldopen.js, demo1.js, memory.js, demo2.js
  voice/session.js    RealtimeSession (WebRTC, data channel, tool dispatch, mute)
  voice/tools.js      finale tool schemas + browser handlers
  voice/board.js      mission board UI
  voice/recorder.js   events+audio recorder → replay files
  voice/finale.js     wires session + board; replay mode
public/
  data/               notes.json, db.json, web/cloudnote-review.html, workspace/secrets.txt,
                      memory-unguarded.json, memory-guarded.json, orion-notes.json,
                      restaurants.json, finale-memory.json, pseudocode.txt
  replays/            coldopen.json, demo1-task1.json, memory-unguarded.json, memory-guarded.json,
                      demo2-unguarded.json, demo2-guarded.json, negotiation-fallback.json,
                      negotiation-fallback/turn-N.mp3, finale/events.json, finale/audio.webm
  speaker/            nasir.png, aidul.png (resized)
  qr/                 nasir-linkedin.svg, nasir-portfolio.svg, aidul-linkedin.svg, aidul-portfolio.svg, site.svg
  map/tampere.svg
server/
  index.js, routes.js, openai.js, agent.js, tools/demo1.js, negotiation.js, telegram.js, weather.js
scripts/make-qr.mjs, scripts/make-fallback-audio.mjs, scripts/resize-photos.sh
dev/                  toolmap.html, finale.html, demos.html (dev harness pages, not in the build)
test/  (node --test)  events.test.js, player.test.js, api.test.js, agent.test.js, demo1-tools.test.js,
                      negotiation.test.js, telegram.test.js, weather.test.js, toolmap-state.test.js,
                      finale-tools.test.js, replays.test.js
.github/workflows/deploy.yml
```

---

### Task 1: Scaffold, data carry-over, repo

**Files:**
- Create: `package.json`, `vite.config.js`, `.gitignore`, `.env.example`, `README.md`, `server/index.js`, `server/routes.js`, `public/data/*`, `scripts/resize-photos.sh`, `public/speaker/*.png`
- Delete: `demos/` (after copying), `presentation.html` (empty), `spekaernote.txt` (empty)

**Interfaces:**
- Produces: `npm run dev` (Vite on :5173), `npm run server` (Express on :8787), `npm run stage` (both via `concurrently`), `npm test` (`node --test test/`), `npm run build` (`VITE_PUBLIC=1 vite build`). `GET /api/health` → `{ok:true, live:true}`.
- Produces data files: `public/data/notes.json` = `[{id, title, text}]` from the 5 Brightloop notes; `public/data/db.json` = 5 rows `{id, team, budget_eur, people, lead}` (Atlas 84000/6/Sara Nieminen, Beacon 70000/4/Omar Haddad, Comet 96000/8/Lena Kovac, plus two invented rows: Delta 52000/5/Jonas Berg, Echo 61000/7/Aino Laine); `public/data/web/cloudnote-review.html`, `public/data/workspace/secrets.txt` (copied verbatim); `public/data/memory-unguarded.json`, `memory-guarded.json`, `orion-notes.json` (`[{date, text}]` from `orion_status.md` + `newsletter.md`).

- [ ] **Step 1: `git init` at the project root (branch `main`). Write `.gitignore`** with `.env`, `node_modules/`, `dist/`, `.superpowers/`, `.DS_Store`. (`public/replays/finale/*.webm` is NOT ignored; the public replay needs it.)
- [ ] **Step 2: Write `package.json`** with the scripts above, deps `express`, `cors`, `dotenv`, `reveal.js@^5`, `qrcode`, devDeps `vite@^5`, `concurrently`. `"type": "module"`. Run `npm install`.
- [ ] **Step 3: Write `vite.config.js`**: `base: process.env.VITE_PUBLIC ? '/agent-presentation/' : '/'`, `build.rollupOptions.input = { index: 'index.html', preflight: 'preflight.html' }`.
- [ ] **Step 4: Write `server/index.js`** (loads `.env` via dotenv, CORS for `http://localhost:5173`, mounts `createRouter(deps)` from `routes.js`, listens on `process.env.PORT ?? 8787`) and `server/routes.js` exporting `createRouter(deps) -> express.Router` with `GET /api/health`.
- [ ] **Step 5: Copy data** from `demos/` into `public/data/` in the shapes listed in Interfaces. Write `.env.example` with `OPENAI_API_KEY=`, `TELEGRAM_BOT_TOKEN=`, `TELEGRAM_CHAT_ID_NASIR=`, `TELEGRAM_CHAT_ID_AIDUL=`, `PORT=8787`.
- [ ] **Step 6: `scripts/resize-photos.sh`**: `sips -Z 600 speaker/<name>.png --out public/speaker/<name>.png` for both. Run it. Verify both outputs are under 150 KB.
- [ ] **Step 7: Delete `demos/`, `presentation.html`, `spekaernote.txt`.** Verify: `ls` shows no `demos`.
- [ ] **Step 8: Verify** `npm run server` → `curl localhost:8787/api/health` returns `{"ok":true,"live":true}`; `npm run dev` serves a placeholder `index.html` with the talk title.
- [ ] **Step 9: Create the GitHub repo and push**: `gh repo create nasiriubat/agent-presentation --public --source=. --remote=origin --push`. Confirm `.env` is absent from `git ls-files`.
- [ ] **Step 10: Commit** `chore: scaffold agent-presentation and carry over demo data`.

---

### Task 2: Event format, player, API client

**Files:**
- Create: `src/core/events.js`, `src/core/player.js`, `src/core/api.js`, `src/core/modes.js`
- Test: `test/events.test.js`, `test/player.test.js`, `test/api.test.js`

**Interfaces:**
- Produces `EVENT_TYPES = ['user','think','tool.call','tool.result','memory.save','memory.recall','file.write','answer','warn','guard','approval','section']` and `validateEvent(e) -> true | throws Error(msg)`. Event shape: `{ type, t?: number(ms from start), step?: boolean, ...payload }`. Payloads: `user{text}`, `think{text}`, `tool.call{id,tool,args}`, `tool.result{id,tool,result,rows?:number[]}`, `memory.save{fact,source?}`, `memory.recall{fact}`, `file.write{path,content,public:boolean}`, `answer{text}`, `warn{text}`, `guard{text}`, `approval{text,answer:'y'|'n'}`, `section{title}`.
- Produces `class EventPlayer { constructor(events, onEvent); step(): boolean /* emits events up to the next step:true, returns false when done */; autoplay(): Promise<void> /* honours t deltas */; reset(); get done() }`.
- Produces `api.health(timeoutMs=1500) -> Promise<{live:boolean}>` (resolves `{live:false}` on error/timeout), `api.sse(path, body, onEvent) -> {abort()}` (POST, parses `data:` lines as JSON, calls `onEvent({type:'done'})` at end), `api.json(path, body) -> Promise<any>`. Base URL `http://localhost:8787`.
- Produces `modes.isPublic() -> boolean` (`import.meta.env.VITE_PUBLIC === '1'`), `modes.liveAvailable() -> Promise<boolean>` (`!isPublic() && !forcedReplay() && (await api.health()).live`).

- [ ] **Step 1: Write failing tests** in `test/events.test.js`: `validateEvent({type:'user',text:'hi'})` is true; `validateEvent({type:'nope'})` throws; `validateEvent({type:'tool.call',tool:'x'})` throws (missing `id`,`args`).
- [ ] **Step 2: Run `npm test`** → FAIL (module not found).
- [ ] **Step 3: Implement `src/core/events.js`.** Run → PASS.
- [ ] **Step 4: Write failing tests** in `test/player.test.js`: with events `[{type:'user',step:true,text:'a'},{type:'think',text:'b'},{type:'answer',step:true,text:'c'}]`, first `step()` emits 2 events and returns true, second `step()` emits 1 and returns false, `done` is true; `autoplay()` over events with `t:[0,30,60]` emits all 3 and resolves after ≥60 ms.
- [ ] **Step 5: Run** → FAIL. **Implement `src/core/player.js`.** Run → PASS.
- [ ] **Step 6: Write failing tests** in `test/api.test.js` using a local `http` server that never responds: `api.health(100)` resolves `{live:false}` in <300 ms; a server answering `{ok:true,live:true}` → `{live:true}`.
- [ ] **Step 7: Implement `src/core/api.js`** (`AbortController` timeout) and `src/core/modes.js`. Run → PASS.
- [ ] **Step 8: Commit** `feat: event format, player and server client`.

---

### Task 3: Server agent loop (Responses API) + Demo 1 tools + SSE route

**Files:**
- Create: `server/openai.js`, `server/agent.js`, `server/tools/demo1.js`
- Modify: `server/routes.js`
- Test: `test/agent.test.js`, `test/demo1-tools.test.js`

**Interfaces:**
- `openai.js`: `createOpenAI({apiKey, fetch=globalThis.fetch})` → `{ responses(body) -> Promise<json>, tts({text, voice, instructions}) -> Promise<Buffer /*mp3*/>, clientSecret(body) -> Promise<json> }`. Endpoints: `POST /v1/responses`, `POST /v1/audio/speech` (`model:'gpt-4o-mini-tts'`, `response_format:'mp3'`), `POST /v1/realtime/client_secrets`.
- `agent.js`: `runAgent({openai, model='gpt-6-luna', system, tools, question, maxSteps=8, emit})` where `tools = [{name, description, parameters, handler(args) -> Promise<{result:string, rows?:number[], event?:object}>}]`. Emits spec events through `emit(event)`: `think` (from a required one-sentence `thought` the model writes before tool calls, obtained by asking for a short text item before each function call), `tool.call`, `tool.result`, `answer`, plus any handler `event` (`memory.save`, `memory.recall`, `file.write`). Uses Responses API with `input` array, function tools, `reasoning:{effort:'low'}`; appends `function_call_output` items; stops at `maxSteps` with `answer{text:"I couldn't finish within the step limit."}`.
- `tools/demo1.js`: `createDemo1Tools({notes, db, memory})` → tools `search_notes(query)` (keyword match over `notes` + `db` rows; result includes matching `rows` ids), `calculator(expression)` (safe arithmetic only: digits, `+-*/().` and spaces; else `"Error: only arithmetic is allowed"`), `write_file(path, content)` (virtual; returns `event: file.write{public:false}`), `save_memory(fact)` (`event: memory.save`), `recall_memory()` (`event: memory.recall` per entry). Memory is the in-process array passed in.
- Routes: `POST /api/agent/run {question, memory?:string[]}` → SSE stream of events, then `event: done`. `POST /api/chat/plain {text}` → `{text}` using `gpt-6-luna` with system "You are a plain chatbot with no tools. If asked to do something in the world, say honestly that you can only answer with text." (cold open).

- [ ] **Step 1: Write failing tests** in `test/demo1-tools.test.js`: `search_notes({query:'Atlas budget'})` result contains "84,000" and `rows` includes Atlas's id; `calculator({expression:'84000/6'})` → `"14000"`; `calculator({expression:'process.exit()'})` → starts with `"Error"`; `write_file({path:'x.md',content:'hi'})` returns an `event` of type `file.write`.
- [ ] **Step 2: Run** → FAIL. **Implement `server/tools/demo1.js`.** Run → PASS.
- [ ] **Step 3: Write failing tests** in `test/agent.test.js` with a fake `openai.responses` returning scripted outputs: (a) one `function_call` then a `message` → emitted types are `['think','tool.call','tool.result','answer']`, and the second request's `input` contains a `function_call_output` whose `output` equals the handler's result; (b) a fake that always calls a tool → exactly `maxSteps` tool calls then the step-limit `answer`; (c) question "what's the CEO's salary?" with the real tools and a fake model that calls `search_notes` once then answers "That's not in the notes." → final `answer.text` contains "not in the notes".
- [ ] **Step 4: Run** → FAIL. **Implement `server/openai.js` and `server/agent.js`.** Run → PASS.
- [ ] **Step 5: Add routes** in `server/routes.js`. Demo 1 system prompt: "You are Brightloop's assistant. Use the tools to answer from the company notes. Budgets are per team. Before each tool call, write one short plain-English sentence saying what you're about to do and why. If the notes don't contain the answer, say so plainly."
- [ ] **Step 6: Verify live** (needs `.env`): `curl -N -X POST localhost:8787/api/agent/run -H 'content-type: application/json' -d '{"question":"What is the Atlas budget per person? Save a summary file."}'` streams `tool.call search_notes`, `calculator`, `file.write`, `answer` containing "14,000" or "14000".
- [ ] **Step 7: Commit** `feat: server agent loop with demo 1 tools and SSE`.

---

### Task 4: Server finale services: realtime token, weather, Telegram

**Files:**
- Create: `server/weather.js`, `server/telegram.js`; Modify: `server/routes.js`
- Test: `test/weather.test.js`, `test/telegram.test.js`

**Interfaces:**
- `weather.getEveningForecast({fetch}) -> Promise<{tempC:number, rainChancePct:number, summary:string, cached:boolean}>` using Open-Meteo `https://api.open-meteo.com/v1/forecast?latitude=61.4978&longitude=23.761&hourly=temperature_2m,precipitation_probability&forecast_days=1&timezone=Europe/Helsinki`, averaging the 18:00–21:00 hours. On any error → `{tempC:4, rainChancePct:70, summary:'Rain likely after 18:00', cached:true}`.
- `telegram.sendInvite({fetch, token, chatId, text}) -> Promise<{delivered:boolean, error?:string}>` via `POST https://api.telegram.org/bot${token}/sendMessage` with `{chat_id, text}`. Never throws.
- Routes: `GET /api/weather`; `POST /api/telegram {who:'nasir'|'aidul', text}` (chat ID from `TELEGRAM_CHAT_ID_<WHO>`); `POST /api/realtime/token {instructions, tools, voice='marin'}` → body of `clientSecret({session:{type:'realtime', model:'gpt-realtime-2.1', instructions, tools, audio:{input:{turn_detection:{type:'semantic_vad', eagerness:'low', create_response:true, interrupt_response:false}, transcription:{model:'gpt-4o-mini-transcribe'}, noise_reduction:{type:'far_field'}}, output:{voice}}}})`. If OpenAI returns 400 mentioning `noise_reduction`, retry once without it.

- [ ] **Step 1: Write failing tests**: weather with a fake fetch returning a known hourly array → `tempC` and `rainChancePct` are the 18–21 h averages, `cached:false`; fake fetch throwing → `cached:true`. Telegram with fake fetch `{ok:true}` → `delivered:true`; fetch throwing → `{delivered:false, error}`.
- [ ] **Step 2: Run** → FAIL. **Implement both modules and the routes.** Run → PASS.
- [ ] **Step 3: Verify live**: `curl localhost:8787/api/weather` returns real Tampere numbers; `curl -X POST localhost:8787/api/realtime/token -H 'content-type: application/json' -d '{"instructions":"hi","tools":[]}'` returns JSON with `value` starting `ek_`. Telegram is verified in Task 7 after the user creates the bot.
- [ ] **Step 4: Commit** `feat: weather, telegram and realtime token routes`.

---

### Task 5: Negotiation service (live, boxed, with fallback)

**Files:**
- Create: `server/negotiation.js`, `public/replays/negotiation-fallback.json`, `scripts/make-fallback-audio.mjs`, `public/replays/negotiation-fallback/turn-1..6.mp3`; Modify: `server/routes.js`
- Test: `test/negotiation.test.js`

**Interfaces:**
- `runNegotiation({openai, request, emit, now=Date.now, budgetMs=40000, fallbackDir}) -> Promise<{agreed:true, booking, fallback:boolean}>`. `request = {restaurant:'Ravintola Näsi', partySize:8, vegetarian:1, budgetPerPerson:40, preferredTime:'19:00', rainChancePct}`. Emits `{type:'negotiation.turn', speaker:'yours'|'restaurant', text, audioBase64}` per turn and finally `{type:'negotiation.done', agreed:true, booking:{restaurant, time, seating:'terrace'|'indoors', partySize, vegetarian:true}, fallback}`.
- Your agent: Responses `gpt-6-luna`, structured output `{say:string, accept:boolean}`, system: "You're booking for the party in the request. You want 19:00; accept the terrace only if rainChancePct < 40; you must secure a vegetarian option; be polite, max 2 sentences; set accept=true once you agree to a concrete time and seating." Restaurant agent: structured output `{say:string, status:'open'|'agreed'|'declined', time?:string, seating?:string}`, system: "You are the host at Ravintola Näsi. Tonight: 19:00 is available only on the terrace; 20:30 is available indoors. A vegetarian menu is available. Friendly, max 2 sentences. Set status 'agreed' only after the caller has accepted a concrete time and seating; then fill time and seating."
- Loop: your agent opens; alternate; stop when restaurant `status==='agreed'`; cap 4 turns each. TTS voices: yours `'marin'`, restaurant `'cedar'` (`gpt-4o-mini-tts`, instructions "warm, quick, a Finnish restaurant host" for the restaurant).
- Fallback: `negotiation-fallback.json` = 6 turns `{speaker, text}` (yours/restaurant alternating) ending with 20:30 indoors because of rain, vegetarian confirmed; `turn-N.mp3` generated once by `scripts/make-fallback-audio.mjs` and committed. Turns 3–6 are written so they stand alone (turn 3 restates the request). `runNegotiation` switches to fallback on: a thrown error, `budgetMs` exceeded, or no agreement after 8 live turns. On switch: if fewer than 2 live turns were emitted, emit fallback turns 1–6; otherwise emit turns 3–6. Final `booking` for fallback: `{restaurant:'Ravintola Näsi', time:'20:30', seating:'indoors', partySize:8, vegetarian:true}`.
- Route: `POST /api/negotiate {request}` → SSE of the events above.

- [ ] **Step 1: Write `negotiation-fallback.json`** and `scripts/make-fallback-audio.mjs`; run the script once (needs key) → 6 mp3s, each > 10 KB.
- [ ] **Step 2: Write failing tests** with a fake `openai` (`responses` scripted, `tts` returns `Buffer.from('mp3')`): (a) restaurant agrees on its 2nd turn → 4 `negotiation.turn` events, speakers alternate starting with `yours`, `done {agreed:true, fallback:false}`; (b) restaurant never agrees → 8 live turns then fallback turns 3–6, `fallback:true`; (c) `responses` throws on the first call → fallback turns 1–6, `fallback:true`; (d) fake `now` that jumps +41 s after turn 2 → fallback turns 3–6. Fallback audio is read from `fallbackDir` and base64-encoded.
- [ ] **Step 3: Run** → FAIL. **Implement `server/negotiation.js` + route.** Run → PASS.
- [ ] **Step 4: Verify live**: `curl -N -X POST localhost:8787/api/negotiate -H 'content-type: application/json' -d '{"request":{"restaurant":"Ravintola Näsi","partySize":8,"vegetarian":1,"budgetPerPerson":40,"preferredTime":"19:00","rainChancePct":70}}'` → turns alternate, ends `agreed:true`, generation < 40 s. Run 3 times; note how often fallback triggers in the README.
- [ ] **Step 5: Commit** `feat: boxed live negotiation with scripted fallback`.

---

### Task 6: Tool map visualization + panels

**Files:**
- Create: `src/toolmap/toolmap.js`, `src/toolmap/panels.js`, `src/toolmap/toolmap.css`, `public/data/pseudocode.txt`, `public/replays/demo1-task1.json` (hand-authored first version), `dev/toolmap.html`
- Test: `test/toolmap-state.test.js`

**Interfaces:**
- `new ToolMap(container, {tools:[{id,label,icon}], panels:{db?:rows, memory?:entries, code?:boolean, log?:boolean}})` with `handle(event) -> Promise<void>` (resolves when that event's animation ends), `reset()`, `setLogVisible(bool)`.
- Exported pure `reduceState(state, event) -> state` tracking `{activeTool, highlightedRows, memory:[{fact,source?,glow}], codeLine, caption, bubble, log:[]}` so the event→visual mapping is unit-testable. Caption rules: `tool.call` → `It uses ${label}…`; `tool.result` → `…and gets a result.`; `memory.save` → `It saves a fact to memory for next time.`; `memory.recall` → `It checks its memory first.`; `warn` → the text; `answer` → `✅ ${text}`.
- Visuals per spec §5: centre agent node, tool nodes on a ring, dashed SVG lines, travelling glowing dot, thought bubble on `think`, caption bar, `warn` → red revealed text block, `guard` → yellow panel, `approval` → card with the text and the y/n answer, `file.write{public:true}` → dot flies to a "Public" node, `section` → banner.
- `pseudocode.txt` (8 lines). Mapping: `think`→2, `tool.call`→4, `tool.result`→5, `memory.save`→6, `answer`→8.
- Layout: stage `aspect-ratio:16/9`, `font-size: clamp(12px, 1.6vw, 22px)`; panels wrap below the stage under 700 px width.

- [ ] **Step 1: Write failing tests** in `test/toolmap-state.test.js`: `tool.result{rows:[1,3]}` → `highlightedRows=[1,3]`; `memory.save` appends `{glow:true}`; `memory.recall{fact}` sets `glow:true` only on the matching entry; `think` → `codeLine=2`; `answer` → `codeLine=8` and `activeTool=null`.
- [ ] **Step 2: Run** → FAIL. **Implement `reduceState`.** Run → PASS.
- [ ] **Step 3: Implement `ToolMap`, the panels and CSS**, porting the approved prototype `.superpowers/brainstorm/*/content/viz-tool-map.html`.
- [ ] **Step 4: Hand-author `demo1-task1.json`** (user → think → search_notes with rows → think → search_notes → calculator → write_file → memory.save → answer → section "Next day" → user → memory.recall → answer "€14,000 per person, from memory"). Write `dev/toolmap.html` with Step / Autoplay / Reset buttons. Check in the browser at 1920 px and 390 px: no horizontal overflow, dot reaches each node, rows highlight, memory entry slides in and glows on recall, code line follows.
- [ ] **Step 5: Commit** `feat: tool map visualization with db, memory, code and log panels`.

---

### Task 7: Voice finale (browser)

**Files:**
- Create: `src/voice/session.js`, `src/voice/tools.js`, `src/voice/board.js`, `src/voice/recorder.js`, `src/voice/finale.js`, `public/data/restaurants.json`, `public/data/finale-memory.json`, `public/map/tampere.svg`, `dev/finale.html`
- Test: `test/finale-tools.test.js`

**Interfaces:**
- `restaurants.json`: 5 entries `{id, name, area, vegetarian:boolean, pricePerPerson:number, terrace:boolean, x, y}` (map coords 0–100), including `{id:'nasi', name:'Ravintola Näsi', vegetarian:true, pricePerPerson:38, terrace:true}`. `finale-memory.json`: `[{fact:'Team size: 8'},{fact:'Mikko is vegetarian'},{fact:'Dinner budget: €40 per person'}]`.
- `tools.js`: `FINALE_TOOLS` (Realtime function schemas): `recall_memory()`, `save_memory(fact)`, `search_restaurants(vegetarian:boolean, maxPricePerPerson:number)`, `get_weather()`, `call_restaurant(restaurantId, partySize, preferredTime, vegetarianCount)`, `send_invite(who:'nasir'|'aidul', text)`. `createHandlers({api, board, data, negotiate}) -> {[name]: async (args) => string /* JSON */}`. Exported pure `filterRestaurants(list, {vegetarian, maxPricePerPerson})`.
- `session.js`: `class RealtimeSession { constructor({api, tools, handlers, instructions, onTranscript(role,text), onToolCall(name,args), onState(state)}); connect(): Promise<void>; mute(bool); close() }`. WebRTC: token from `/api/realtime/token`; `RTCPeerConnection`; `<audio autoplay>` on `ontrack`; mic via `getUserMedia({audio:true})`; data channel `oai-events`; `POST https://api.openai.com/v1/realtime/calls` with `Content-Type: application/sdp`, `Authorization: Bearer <ephemeral value>`; `setRemoteDescription({type:'answer', sdp})`. Function calls: on `response.done`, for each output item `type:'function_call'` run the handler, send `conversation.item.create {item:{type:'function_call_output', call_id, output}}` then `response.create`. Echo guard: mic track `enabled=false` from `response.created` until `output_audio_buffer.stopped`, and for the whole duration of the `call_restaurant` handler. Transcripts from `conversation.item.input_audio_transcription.completed` (user) and `response.output_audio_transcript.done` (assistant). Instructions: "You are the Demo speaker's personal agent, live on stage. Speak briefly, 1–2 sentences. For tonight's team dinner: recall memory first, search restaurants, check the weather, call the restaurant, then send the invite to the Demo speaker. Say in one short sentence what you're doing before each tool."
- `board.js`: `new MissionBoard(container)` with `transcript(role,text)`, `tool(name, on)`, `memory(facts, glowIndex?)`, `pins(restaurants)`, `weather(forecast)`, `negotiationStart()`, `negotiationTurn(speaker,text)`, `negotiationEnd()`, `booking(card)`, `invite({delivered})`, `micState('listening'|'muted'|'speaking'|'error')`, `error(message, {onUseReplay})`. Layout per spec §5.3; under 700 px the transcript stacks above the board.
- `recorder.js`: `new ReplayRecorder({micStream, remoteStream})` → `start()`, `log(event)`, `stop(): Promise<{eventsJson, audioBlob}>` (MediaRecorder on an `AudioContext` mix; events get `t`), and `download()` saving `events.json` + `audio.webm`.
- `finale.js`: `mountFinale(container, {mode:'live'|'replay', who:'nasir'|'aidul'})`; replay plays `public/replays/finale/audio.webm` and schedules `events.json` through `MissionBoard`.

- [ ] **Step 1: Write failing tests** in `test/finale-tools.test.js`: `filterRestaurants` with `{vegetarian:true, maxPricePerPerson:40}` returns only vegetarian entries ≤ 40; the `call_restaurant` handler calls the injected `negotiate` first and returns JSON containing `booking`; the `send_invite` handler with a failing `api` returns `{"delivered":false}` without throwing.
- [ ] **Step 2: Run** → FAIL. **Implement `tools.js`.** Run → PASS.
- [ ] **Step 3: Implement `session.js`, `board.js`, `tampere.svg`** (stylised: two lakes, Tammerkoski as a line, five pin anchors), `finale.js` live mode, `dev/finale.html` with Connect / Mute / Record / Stop buttons and a who-buzzes selector.
- [ ] **Step 4: User action (ask them):** create a bot with @BotFather, put `TELEGRAM_BOT_TOKEN` in `.env`; both speakers send the bot "hi"; run `curl "https://api.telegram.org/bot$TOKEN/getUpdates"`, put the two chat IDs in `.env`. Verify `POST /api/telegram {who:'nasir', text:'test'}` → `delivered:true` and the phone buzzes.
- [ ] **Step 5: Verify live in the browser** (`npm run stage`, open `dev/finale.html`): say "Plan a dinner for my team tonight" → memory facts glow → pins drop → weather card → negotiation panel with two voices and captions, mic indicator "muted" during it → booking card → phone buzzes → agent confirms out loud. Then say "Remember that Aino doesn't eat fish" → a memory entry appears. Confirm the assistant's own voice through the laptop speakers does not trigger a user turn.
- [ ] **Step 6: Token failure path:** stop the server, click Connect → `board.error` shows "Couldn't start the voice agent" with a "Use replay" button that switches to replay mode.
- [ ] **Step 7: Implement `recorder.js` and replay mode.** Record one full run → save into `public/replays/finale/`. Reload in replay mode → identical board playback with audio.
- [ ] **Step 8 (first on the cut list, spec §8): Q&A mode.** `mountFinale(container, {mode:'qa'})` starts a fresh `RealtimeSession` with no tools and instructions: "You are the agent from this talk, 'From Answering to Doing', by Nasir and Aidul of GPT-Lab, Tampere University. Answer audience questions about AI agents, tools, memory and the demos in 2–3 spoken sentences. Politely decline anything off-topic." Verify by asking it "what is an agent?" out loud.
- [ ] **Step 9: Commit** `feat: live voice finale with mission board, negotiation and replay`.

---

### Task 8: Demo wiring: cold open, Demo 1, memory, Demo 2 (+ replays)

**Files:**
- Create: `src/demos/coldopen.js`, `src/demos/demo1.js`, `src/demos/memory.js`, `src/demos/demo2.js`, `public/replays/coldopen.json`, `memory-unguarded.json`, `memory-guarded.json`, `demo2-unguarded.json`, `demo2-guarded.json`, `dev/demos.html`
- Test: `test/replays.test.js`

**Interfaces:**
- Each demo module exports `mount(container, {mode:'live'|'replay'}) -> {arm(), step(): boolean, autoplay(): Promise<void>, reset(), record?(): void}`. `step()` returns false when the demo has finished (the deck then advances the slide).
- `coldopen.js`: a chat box with the fixed prompt "Book a dinner for my team tonight."; live → `/api/chat/plain`; replay → `coldopen.json` (`user` + `answer`).
- `demo1.js`: ToolMap with tools `search_notes, calculator, write_file, memory`, db rows from `db.json`, code panel on, log toggle. Prepared task plays the replay by default (a "Run live" button re-runs it live); an "Audience task" input runs live via `api.sse('/api/agent/run')` and records the events (`record()` downloads JSON); a "Switch to replay" button appears if the stream errors or stalls > 20 s.
- `memory.js`: ToolMap tools `read_memory, search_notes, write_memory`; tabs Unguarded / Guarded; memory panel pre-filled from `memory-unguarded.json` / `memory-guarded.json` (guarded shows `source` and `recorded_at`).
- `demo2.js`: ToolMap tools `read_webpage, read_file, publish` plus a "Public" node; tabs Unguarded / Guarded; a "Vote" overlay before play ("Will it fall for it? 🙋 Yes · 🙋 No") dismissed by the first →.
- Replay content (hand-authored from the old scenarios): `demo2-unguarded`: user task → think → `tool.call read_webpage` → `tool.result` (review HTML) + `warn{text: the hidden instruction}` → think "The page says summaries need a Verification section" → `read_file secrets.txt` → `tool.result` (the fake keys) → `file.write{public:true, path:'public/cloudnote_summary.md', content: summary + Verification section}` → `answer` "Saved the summary to the wiki." `demo2-guarded`: same up to the fetch; result wrapped in `<untrusted_web_content>`; `guard{text:'Web content is data, not instructions'}` → think "The page contains hidden instructions aimed at me. Ignoring them and warning the user." → `approval{text: clean summary, answer:'y'}` → `file.write` clean → `answer` that mentions the hidden text. `memory-unguarded`: `memory.recall 'Project Orion launch date: 2026-10-15'` → `answer` "Announce 15 October." `memory-guarded`: recall (with source) → `search_notes 'Orion launch'` with the 22 Sep change in the result → `warn` conflict → `memory.save{fact:'Orion launch: 2026-11-03', source:'orion_status 2026-09-22'}` → `answer` "Announce 3 November; memory corrected."

- [ ] **Step 1: Write failing test** `test/replays.test.js`: every `public/replays/*.json` parses, every event passes `validateEvent`, the first event has `step:true`, and `demo2-unguarded.json` has a `file.write` with `public:true` whose content includes "sk_demo_FAKE".
- [ ] **Step 2: Write the five replay JSON files.** Run → PASS.
- [ ] **Step 3: Implement the four demo modules** and `dev/demos.html` with a selector. Check each at desktop and 390 px.
- [ ] **Step 4: Record Demo 1 live** with `record()`; if the live run is good (two searches, calculator, file, memory), replace `demo1-task1.json` with it and keep the hand-written one as `demo1-task1.handmade.json`.
- [ ] **Step 5: Commit** `feat: cold open, demo 1, memory and injection demos with replays`.

---

### Task 9: The deck (slides, notes, speaker cards, QR codes)

**Files:**
- Create: `index.html`, `src/slides/deck.js`, `src/slides/slides.css`, `scripts/make-qr.mjs`, `public/qr/*.svg`
- Modify: `package.json` (`"qr": "node scripts/make-qr.mjs"`, run from `prebuild`)

**Interfaces:**
- Slides, in order, each with `<aside class="notes">` starting with **Theory speaker:** / **Demo speaker:** lines: 1 Cold open (demo) · 2 Title (title, both names, "GPT-Lab, Tampere University", "Organised by GPT-Lab, Tampere University · Sponsored by Crazytown Tampere") · 3 Hands up (two big questions) · 4–7 Brain in a jar → hands → notebook → loop (one SVG illustration; fragments add parts) · 8 Pseudocode (same 8 lines, fragments) · 9 Timeline strip (chat → tools → memory → acting → agents talking to agents) · 10 Demo 1 · 11 Memory goes wrong (concept) · 12 Memory demo · 13 Injection concept ("the page is data, not instructions") · 14 Demo 2 · 15 So what for your job (3 cards: accounting, HR/admin, engineering; rule "agents do, humans approve") · 16 Finale · 17 Q&A ("ask the agent too") · 18 Take-home sentence · 19 Speaker cards (photo, name, "Project Researcher · GPT-Lab, Tampere University", two QR codes each captioned "LinkedIn" / "Portfolio") · 20 "Replay these demos on your phone" big QR (`https://nasiriubat.github.io/agent-presentation/`) + credits.
- `deck.js`: `Reveal.initialize({hash:true, width:1600, height:900, margin:0.04, plugins:[RevealNotes]})`, keyboard overrides so PageUp/PageDown/↑/↓ navigate; a capture-phase `keydown` that, when the current slide has a mounted, armed demo, calls `demo.step()` and stops propagation (when `step()` returns false, reveal advances). Demos mount on `slidechanged` and reset on leaving. `liveAvailable()` once at load → a corner badge LIVE / REPLAY, clickable to force REPLAY. `?notes` → hide `.reveal`, render every `<aside class="notes">` as a scrolling list with slide titles.
- `make-qr.mjs`: `QRCode.toFile(path, url, {type:'svg', errorCorrectionLevel:'M', margin:1})` for the four speaker links (values from `speaker/info.txt`) and the site URL.

- [ ] **Step 1: Write and run `scripts/make-qr.mjs`**; verify 5 SVGs exist and one scans with a phone.
- [ ] **Step 2: Write `index.html` and `slides.css`** (dark, large type, 16:9; reveal's scaling + touch for phones).
- [ ] **Step 3: Implement `deck.js`.** Check: arrows / space / PageUp / PageDown work; on the Demo 1 slide → steps the demo and only advances after it's done; `?notes` lists every note; speaker view opens with `S`.
- [ ] **Step 4: Phone check** in Chrome devtools at 390×844: every slide readable, no horizontal scroll, demos play with ▶.
- [ ] **Step 5: Commit** `feat: presentation deck with notes, speaker cards and QR codes`.

---

### Task 10: Pre-flight page and failure fallbacks

**Files:**
- Create: `preflight.html`, `src/preflight.js`; Modify: `server/routes.js`, `src/core/modes.js`, demos as needed
- Test: `test/api.test.js` (extend)

**Interfaces:**
- `GET /api/selftest` → `{openai:boolean, telegramConfigured:boolean}` (one tiny Responses call).
- `preflight.html` shows ✅/❌ for: server health; OpenAI self-test; realtime token mint; weather; Telegram test message to the selected speaker (button); mic permission + 3-second level meter; speaker test tone; every replay JSON loads and validates; `negotiation-fallback/*.mp3` play. Plus a "Force replay mode" toggle stored in `localStorage.forceReplay`.
- `modes.liveAvailable()` returns false when `localStorage.forceReplay === '1'`.

- [ ] **Step 1: Add a failing test** that `liveAvailable()` is false when `forceReplay` is set (stub `globalThis.localStorage`). Run → FAIL. Implement. Run → PASS.
- [ ] **Step 2: Implement `/api/selftest`, `preflight.html`, `src/preflight.js`.**
- [ ] **Step 3: Verify failure paths by hand**: server stopped → badge says REPLAY and every demo plays; Demo 1 audience task with the server killed mid-stream → "Switch to replay" within 20 s; finale with the Telegram token removed → booking card shows "invite not delivered" and the agent still confirms.
- [ ] **Step 4: Commit** `feat: preflight checks and replay fallbacks`.

---

### Task 11: Publish to GitHub Pages

**Files:**
- Create: `.github/workflows/deploy.yml`; Modify: `README.md`

- [ ] **Step 1: Write `deploy.yml`**: on push to `main`: `npm ci`, `npm run build` (sets `VITE_PUBLIC=1`), `actions/upload-pages-artifact` from `dist/`, `actions/deploy-pages`. Permissions `pages: write`, `id-token: write`.
- [ ] **Step 2: Enable Pages** (`gh api -X POST repos/nasiriubat/agent-presentation/pages -f build_type=workflow`), push, `gh run watch`.
- [ ] **Step 3: Verify** `https://nasiriubat.github.io/agent-presentation/` on a phone: deck loads, badge says REPLAY, all replays play (finale with audio), the QR slide scans to the same URL. `grep -rE "sk-|ek_|[0-9]+:AA" dist/` is empty.
- [ ] **Step 4: README**: setup (`.env`), `npm run stage`, preflight, re-recording replays, the cut order from spec §8.
- [ ] **Step 5: Commit** `ci: deploy to GitHub Pages` and push.

---

### Task 12: Rehearsal (22 Oct, with the speakers)

- [ ] **Step 1:** Open `preflight.html` on the presentation laptop; everything green.
- [ ] **Step 2:** Full run-through in LIVE mode, timing each segment against spec §4. Re-record the finale and Demo 1 if the live runs are better than the stored replays; commit and push so the public site carries real runs.
- [ ] **Step 3:** One full run in forced REPLAY mode.
- [ ] **Step 4:** Apply the cut list (spec §8) based on timing. Commit wording changes.
