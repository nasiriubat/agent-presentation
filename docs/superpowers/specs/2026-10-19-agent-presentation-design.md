# "From Answering to Doing": session design

**Event:** Crazytown Tampere, 23 October 2026, 60 minutes. Organised by GPT-Lab, Tampere University. Crazytown Tampere is credited as sponsor.
**Speakers:** Md. Nasir Uddin Shuvo and Md. Aidul Islam, both Project Researchers at GPT-Lab, Tampere University.
**Deliverable:** one web-based presentation with three built-in animated demos, used on stage and then shared with the audience through a QR code.
**Deadline:** usable and rehearsed by 22 October 2026. That leaves 3 build days.

---

## 1. Intent

The talk title is *"From Answering to Doing: Beyond the chatbot, how AI agents use tools, remember, and act."* The official description promises "live demos of both what works and what fails."

Most of the room is **not technical**: people from accounting and other non-technical departments, a few graduate students, and a handful of people who already know agents. The talk is built for the non-technical majority, with enough real depth (the actual loop, real tool calls, real failures) that the experts stay engaged.

**The one sentence people should take home:**
> "AI isn't just a chat box anymore. It can look things up, use tools, remember things, and do work on its own. It can also get things wrong in ways you need to watch for."

**Why it should be visual:** non-technical people can't follow a terminal. Every concept (tool use, memory saved, memory recalled, the agent choosing its next step) has to be *seen* as an animation, in plain-English captions, while it happens.

**Engagement goal (the speakers' explicit wish):** nobody gets bored from the first minute to the last. In practice, no stretch of more than about 6 minutes without something happening on screen or the audience doing something.

## 2. Goals, non-goals, anti-goals

**Goals**
- A presentation that runs in a browser, full screen on a 16:9 projector, and opens with a cold open (no title slide first).
- Three demos in one consistent visual language (the "tool map", described below).
- A live voice finale that talks out loud and acts on screen.
- After the talk, the same site is public. A QR code on the last slide opens it, and visitors can **replay every demo themselves** on their phones.
- Responsive: usable on a phone as well as on the projector.

**Non-goals**
- No real personal data. The calendar, restaurants, company notes and secrets are all fictional.
- No agent framework. Simple, readable code; the agent loop stays small enough to show on a slide.
- No live voice on the public site, which would need a key. Visitors get replays.

**Anti-goals (failure even if it "works")**
- **An API key in the public repo or the deployed site.** Keys stay in a local `.env` that git ignores.
- Walls of text on slides, or jargon without a picture.
- A demo that depends only on Wi-Fi or the API. **Every demo has a recorded replay** that runs offline, including the voice finale.
- Imitating a real company's branding. Restaurants and companies are fictional. GPT-Lab, Tampere University and Crazytown Tampere appear only as text credits for the organiser and sponsor (logos only if the speakers supply the files).

## 3. Roles

Two speakers. The slides and notes refer to them by **role**, not by name, because they may swap:
- **Theory speaker:** tells the story and explains the concepts.
- **Demo speaker:** drives the demos and plays the "user". Their phone is the one that buzzes in the finale.

## 4. Run of show (60 min)

| Time | Segment | What's on screen / what happens | Audience engagement |
|---|---|---|---|
| 0–3 | **Cold open** | A plain chatbot box. The demo speaker types "Book a dinner for my team tonight." A real model with **no tools** answers that it can't. The theory speaker: *"By the end of this hour, the same kind of AI will do this while you watch, and talk while it does it."* Then the title slide (title, both speakers, GPT-Lab · Tampere University, sponsor credit for Crazytown Tampere). | A promise that's paid off at minute ~45 |
| 3–6 | **Hands up** | "Who used ChatGPT this week?" → "Who had it actually *do* something: send, book, change?" → *"That gap is this talk."* A short who-we-are line (full profiles come at the end). | Show of hands |
| 6–13 | **Brain in a jar → brain with hands** | One animated picture that builds up step by step: the chatbot is a brain in a jar. It gets **hands** (tools), a **notebook** (memory) and a **to-do loop** (deciding the next step). Then the **agent loop pseudocode** appears (see 5.4), still in plain language. A short "how we got here" strip: chat → tools → memory → agents acting → agents talking to agents. | Visual build-up, one idea per click |
| 13–23 | **Demo 1 · Watch it work** | The tool map, with the visible database and memory list (5.1). A prepared task first, then **an audience member suggests a task**, which runs live. | Audience-chosen task |
| 23–27 | **When memory goes wrong** | Short concept plus a mini replay: an old memory entry with no date gives a confident wrong answer, then the guarded version checks the source and corrects its memory (based on the existing `demos` memory scenario). | Sets up the risk theme |
| 27–37 | **Demo 2 · Watch it get fooled** | The prompt-injection scenario in the tool-map style (5.2). Before pressing play, the room **votes by show of hands**: "Will it fall for it?" The unguarded run leaks the secret, then the guarded run stops it with a human approval step. | Prediction, then suspense |
| 37–42 | **"So what for your job?"** | Three short, concrete examples: accounting, HR or admin, and engineering or research. Plus the rule *"agents do, humans approve."* | Relatable examples |
| 42–52 | **Demo 3 · Live voice finale** | Team dinner tonight, with agent-to-agent negotiation and the Telegram buzz (5.3). Pays off the cold open. | The wow moment |
| 52–58 | **Q&A** | The voice agent stays on, so audience questions can be put to it as well. | Interaction |
| 58–60 | **Close** | The take-home sentence. Then two speaker cards: photo, name, "Project Researcher · GPT-Lab, Tampere University", and **two QR codes each with a caption below: "LinkedIn" and "Portfolio"**. Then one large QR code: "Replay these demos on your phone" linking to the public site. Credit line: organised by GPT-Lab, Tampere University · sponsored by Crazytown Tampere. | Take-home |

Timings are a guide. Each slide carries speaker notes labelled **Theory speaker** or **Demo speaker**.

## 5. The demos

### Shared visual language: the "tool map"
The user approved this style after seeing a prototype (the prototype is in `.superpowers/brainstorm/.../content/viz-tool-map.html`):
- A dark stage. The **agent** sits in the centre, and **tools** are nodes around it, joined by dashed lines.
- A **tool call** is a glowing dot travelling from the agent to the tool. The line turns solid and the tool node lights up. The dot returns carrying the result.
- A **thought bubble** above the agent shows its reasoning in plain English ("That's per team. I still need the headcount.").
- A **caption bar** at the bottom narrates in plain English for non-technical people.
- An optional **"what really happened" log** panel (monospace) shows the actual tool names, arguments and results. It can be toggled on or off.
- **Presenter control:** on stage, each step advances when the presenter presses → or Space. On the public site, there's also a ▶ autoplay button.

### 5.1 Demo 1 · Watch it work
Scenario: a fictional company knowledge base. Reuse the content in `demos/demo1_tools/data/notes` (team budgets and headcounts, for example "Atlas budget €48,000, Atlas 12 people").

Extra panels (the user asked for these specifically):
- **Database panel:** a small, readable table with about **five rows** of company data, visible from the start. When the agent searches, the **rows it actually reads highlight**.
- **Memory panel:** a list of memory entries. A **new entry slides in** when the agent saves one, and an entry **glows** when it's recalled.
- **Code panel:** the agent-loop pseudocode (5.4), with the **line currently running highlighted** in step with the animation.

Flow of the prepared task: question → think → search (rows highlight) → search again → calculator → write file → save to memory → answer. Then "the next day": the same question is answered from memory in one step.

Live audience task: the demo speaker types a question from the audience. It runs live against the OpenAI model with the same tools and data. If it fails or the network is down, the presenter switches to a recorded run.

### 5.2 Demo 2 · Watch it get fooled
Scenario: the existing prompt-injection case in `demos/demo2_failures` (the `web/`, `workspace/` and `data/` files and `scenarios/injection.py`). The agent is asked to summarise a web page. The page contains hidden white-on-white text instructing it to read `secrets.txt` and publish it.
- Tools on the map: Read web page, Read file, Publish (public).
- **Unguarded:** when the page is fetched, the hidden instruction is **revealed in red** on screen. The agent follows it, the secret travels to "Public", and the final answer doesn't mention it.
- **Guarded:** the page content is labelled "untrusted". The agent points out the hidden text, and a **human approval card** ("Publish this? y/n") shows exactly what's about to go out.
- This demo runs from **recordings on stage by default**, because live models often resist the attack, which makes for a weaker demo. The existing hand-made recording `recordings/demo2_injection_attack_succeeds.json` shows the intended attack. Equivalent recordings need to exist in the new format.

The short "when memory goes wrong" segment (minutes 23–27) uses the same visual style with the existing memory scenario (`scenarios/memory.py`, `data/memory.json`): an undated, unsourced memory → wrong date. The guarded version shows the source and date, verifies against the notes, and corrects the memory.

### 5.3 Demo 3 · Live voice finale: "Plan tonight's team dinner"
The **Demo speaker talks out loud**, and the agent **talks back out loud** in real time. **Always-listening** (automatic turn detection), not push-to-talk. The user decided this. A visible **mute button** is the safety valve.

Layout (approved direction from the `voice-layout.html` prototype, with new content):
- **Left:** a live transcript of the conversation, with a microphone and waveform indicator.
- **Top right:** a compact tool strip (Memory, Restaurants, Weather, Call restaurant, Message) where the active tool lights up, so the tool-map idea carries through.
- **Right:** a **mission board** that fills in as the agent works: memory facts used, a stylised map of Tampere with restaurant pins, a weather card, the negotiation panel, and the final booking card.

Story beats:
1. "Plan a dinner for my team tonight."
2. The agent **recalls pre-seeded memory**: "one vegetarian on the team", "budget €40 per person", "team size 8". Each recalled fact glows on the board.
3. It **searches fictional restaurants** (pins drop on the map) and **checks the weather**. Real forecast data is preferred (see section 7). The weather affects terrace versus indoor seating.
4. **Agent-to-agent call:** the screen splits into "🧑‍💼 Your agent" and "🍽️ Restaurant agent". They **speak out loud in two clearly different voices**, with live captions, and the speaking side glows. The app controls whose turn it is: strictly alternating, a **maximum of about 4 exchanges each**, about 30–40 seconds in total. They negotiate the time, seating and the vegetarian option. The restaurant agent is given realistic constraints (for example, 7pm is only available on the terrace, 8:30 indoors).
5. A **booking card** appears with the agreed details.
6. The agent sends a **Telegram message** to the Demo speaker's phone with the invitation. **The phone buzzes on stage.** This is the moment the action leaves the screen.
7. The agent confirms out loud.

Optional extra beat if time allows: the speaker tells it something new to remember during the conversation, and it's saved to the memory panel.

**Backup:** a full recorded run (audio plus the on-screen events) that replays offline and is identical to the live one visually. This is also the version on the public site.

### 5.4 Agent-loop pseudocode (shown in section 6–13 and in Demo 1)
Plain-language and short, about 8–10 lines, along the lines of:
```
while not done:
    thought = model.think(question, memory, tool_results)
    if thought.wants_tool:
        result = run_tool(thought.tool, thought.input)
        tool_results.add(result)
        if worth_remembering(result): memory.save(result)
    else:
        say(thought.answer); done = True
```
The exact wording is up to the builder. It must match what the real code does, in spirit, and it must be readable by someone who doesn't code.

## 6. Two modes: stage and public

| | Stage (Nasir's laptop) | Public site (GitHub Pages) |
|---|---|---|
| Slides | ✔ | ✔ (responsive, swipe or tap on phones) |
| Demo 1 prepared task | live or replay | replay |
| Demo 1 audience task | live | — |
| Demo 2 / memory | replay (live optional) | replay |
| Demo 3 voice | live (replay as backup) | replay |
| Cold-open chatbot | live | replay |
| Needs a key | yes, from local `.env` | **no** |

The site detects whether the local server is available. If it isn't, it falls back to replay automatically. On stage, there's a visible way to force replay mode if Wi-Fi fails.

## 7. Constraints and decisions already made

- **Model provider: OpenAI only.** The key already exists in `.env` at the project root as `OPENAI_API_KEY`. The voice finale uses OpenAI's **realtime speech-to-speech model** (the user believes it has good noise handling). Demos 1 and 2 and the cold open use a regular OpenAI text model with tool calling. The builder confirms the current model names in OpenAI's docs and with the key.
- **Hosting:** public GitHub repo **`nasiriubat/agent-presentation`**, served by **GitHub Pages** at `https://nasiriubat.github.io/agent-presentation/`. The user has authorised creating and publishing it.
- **Telegram:** used for the phone buzz. It needs a bot token (created through @BotFather) and the Demo speaker's chat ID, stored in the local `.env`, never in the repo.
- **Speaker assets:** `speaker/nasir.png`, `speaker/aidul.png`, `speaker/info.txt`:
  - Md. Nasir Uddin Shuvo: LinkedIn https://www.linkedin.com/in/nasir-shuvo/ · Portfolio https://nasiriubat.github.io/portfolio
  - Md. Aidul Islam: LinkedIn https://www.linkedin.com/in/aidul23/ · Portfolio https://aidul23.github.io/aidulislam/
- **Existing `demos/` folder:** a Python agent built on Anthropic. The speakers have approved **deleting it and starting fresh**. Its scenario wording and data (company notes, the injection web page, `secrets.txt`, the memory entries) are copied into the new project's data files first, then the folder (including its nested `demos/.git`) is removed.
- **Repository layout:** this project folder becomes the git repo `nasiriubat/agent-presentation`. `.env`, `.superpowers/` and any recordings that contain keys are git-ignored. The speaker photos are part of the public site (they're already public on LinkedIn); `speaker/nasir.png` is 650 KB and should be resized for the web.
- **Date detail:** 23 October 2026 is a **Friday**, so the dinner story is **"dinner for my team tonight"**, not "on Friday". The cold-open request is worded the same way, and the weather check is for this evening in Tampere.
- **Language:** English.
- **Projector:** 16:9, large type, readable from the back of a room. Works in a dark theme.

## 8. Settled after review

**Decided by the speakers:**
- **Negotiation is "live but boxed in".** Two model-driven agents genuinely negotiate. The restaurant agent has fixed availability (7pm terrace only, or 8:30pm indoors, with a vegetarian option available on request). There's a hard limit of 4 turns each. If there's no agreement by then, or a turn errors or times out, the app switches seamlessly to a pre-written, pre-voiced fallback exchange that reaches the same booking. Memory recall, restaurant search, weather and Telegram stay fully live regardless.
- **Audio:** the laptop's sound goes out through the venue speakers (the speakers expect this; to be confirmed at the venue). Design for room-speaker playback and include a mic and echo test in the pre-flight checklist. If no handheld or headset mic is available, the laptop's built-in mic must still work, and the mic-muting rule below matters even more.

**Claude's calls (the speakers can override):**

- **Cut order if time runs short** (cut first → last): voice Q&A → live Demo 1 audience task (keep the replay) → optional memory beat in the finale → phone-specific polish of the public site. **Must-haves:** cold open, slides, Demo 1 (replay at least), memory segment, Demo 2 (replay), the voice finale with replay backup, closing slide with QR codes. Build order: voice finale first (riskiest), then the tool-map engine and Demos 1 and 2, then the slides, then publishing.
- **Presenter view:** speaker notes open in a separate presenter window that stays in sync with the main one (works when the projector extends the screen). The same notes are also reachable at a `?notes` URL, which can be opened on a phone if the screen is mirrored. Navigation accepts → / Space / PageDown / ↓ (next) and ← / PageUp / ↑ (previous), so standard clickers work.
- **Mic is off while the agents' own voices play:** during the agent-to-agent negotiation and while the assistant speaks long answers, input is muted so the room speakers can't trigger the turn detection. The on-screen mic indicator shows this state.
- **Telegram:** both speakers' chat IDs are stored in `.env`. A setting on stage chooses whose phone buzzes, so the roles can swap. **The user must create the bot via @BotFather, and each speaker must message it once** so the chat IDs can be collected.
- **Voice Q&A scope (if kept):** the agent knows the talk content and the two speakers, answers questions about agents and the session in two or three sentences, and politely declines anything off-topic. It's a separate short session with its own instructions, not a continuation of the dinner role.

## 9. Left to the builder

- Slide engine (hand-rolled or a library like reveal.js) and code structure.
- The local live server's language and design (it holds the key, proxies OpenAI calls, creates short-lived realtime session tokens for the browser, and sends the Telegram message).
- Recording format for replays, and how replays are captured from real live runs.
- How the two negotiating voices are produced (within the "live but boxed in" decision in section 8), as long as they're two clearly different voices, alternate cleanly and finish within about 40 seconds.
- Map rendering (a stylised offline SVG is preferred over a tile service), restaurant names (fictional), and the exact data rows.
- The weather source. A free, keyless forecast service with a canned fallback is preferred.
- QR code generation. Codes must be generated locally or at build time, scannable from the back of a room, with captions below.
- A pre-flight checklist and rehearsal mode (for example, a single page that tests the mic, key, Telegram and replays).
- The visual polish of slides, animations and the brain-in-a-jar illustration, consistent with the tool-map prototype.
- Wording of the "So what for your job?" examples (the speakers will review them).
