# Speaker script · From Answering to Doing

Generated from the speaker notes in `index.html` by `npm run script`. Edit the notes in the slides, not this file.

**Roles.** The **Theory speaker** tells the story and explains the ideas. The **Demo speaker** drives the demos, plays the "user", and talks to the voice agent. Swap roles however you like; the script only ever names the role. Keyboard: → steps a demo or advances a slide, ← goes back, ▶ on a demo plays and pauses, ↺ restarts it.

**Timing.** 60 minutes in total. The minute marks below are targets; the cut order if you run long is in the README.

| # | Slide | Minutes | Who leads |
|---|---|---|---|
| 1 | Cold open | 0–2 | Demo speaker |
| 2 | Title | 2–3 | Theory speaker |
| 3 | Hands up | 3–5 | Theory speaker |
| 4 | Today | 5–6 | Theory speaker |
| 5 | Chatbot vs agent | 6–8 | Theory speaker |
| 6 | Brain in a jar | 8–12 | Theory speaker |
| 7 | The loop | 12–15 | Theory speaker |
| 8 | What counts as a tool | 15–17 | Theory speaker |
| 9 | How we got here | 17–19 | Theory speaker |
| 10 | How to read the demos | 19–20 | Demo speaker |
| 11 | Demo 1 · Watch it work | 20–28 | Theory speaker |
| 12 | Memory can lie | 28–29 | Theory speaker |
| 13 | Demo 1 · continued | 29–33 | Demo speaker |
| 14 | Demo 2 · Watch it do your work | 33–41 | Theory speaker |
| 15 | Data vs instructions | 41–43 | Theory speaker |
| 16 | Three habits | 43–45 | Theory speaker |
| 17 | So what for your job | 45–48 | Theory speaker |
| 18 | Demo 3 · Hear it act | 48–55 | Theory speaker |
| 19 | Frameworks | 55–56 | Theory speaker |
| 20 | Learn it free | 56–57 | Theory speaker |
| 21 | Take-home | 57–58 | Theory speaker |
| 22 | Q&A | 58–60 | Both |
| 23 | Speakers | 60 | Both |
| 24 | Replay the demos | 60 | Both |

---

## 1 · Cold open  <sub>⏱ 0–2</sub>

*Demo slide: → steps the demo, ▶ plays it, ↺ restarts. The slide only advances when the demo is done.*

**Demo speaker:** No introduction, no title. The chat window is already on screen. Press → to type "Book a dinner for my team tonight." Press → again: the chatbot answers that it can't.

**Theory speaker:** "This is what most of us know as AI. Polite, clever, and it can't actually do anything. By the end of this hour, the same kind of AI will book that dinner while you watch, and talk while it does it."

**Cue:** → to the title slide.

## 2 · Title  <sub>⏱ 2–3</sub>

**Theory speaker:** Ten seconds: "We're Nasir and Aidul, project researchers at GPT-Lab, Tampere University. Thanks to Crazytown for hosting us." No bios here; the profiles come at the end.

## 3 · Hands up  <sub>⏱ 3–5</sub>

**Theory speaker:** First question: expect almost every hand. Count out loud, enjoy it. Press → for the second question: expect very few hands. "Keep those hands in mind. Everything today is about that gap: answering is easy, doing is new."

**Cue:** → to the agenda.

## 4 · Today  <sub>⏱ 5–6</sub>

**Theory speaker:** One breath: "Three demos, and just enough theory to read them. Nothing here is a mock-up: real model, real tool calls." Point at the third: "That one pays off the chatbot you just saw fail."

## 5 · Chatbot vs agent  <sub>⏱ 6–8</sub>

**Theory speaker:** "Same model underneath. The difference is what it's allowed to touch, and whether it keeps going after the first answer." Read the right column slowly: look up, remember, use tools, work in steps. "Those four words are the whole talk."

## 6 · Brain in a jar  <sub>⏱ 8–12</sub>

**Theory speaker:** The one picture people should take home. Each → adds a part to the 3D jar on the right.

**Theory speaker:** Hands: "a tool is just a function the AI is allowed to call: search, calculator, send an email." Notebook: "memory it writes to and reads later, across conversations, not just this chat." Loop: "it doesn't answer once. It tries something, looks at what happened, and decides what to do next." Last →: "That's an agent. Everything else is detail."

## 7 · The loop  <sub>⏱ 12–15</sub>

**Theory speaker:** "Don't worry if you don't code. Read it like a recipe." Step through with →, one line each: "Keep going until done. Ask the model what to do next, with the question, its memory and what it has found so far. If it wants a tool, we run the tool, we keep the result, and if it's worth remembering we write it in the notebook. Otherwise it answers and we stop."

**Theory speaker:** Last →, the note: "The AI only ever picks. The program does. That line is where control lives, and where we'll put a human later." Then: "You'll see this exact loop light up in the first demo."

## 8 · What counts as a tool  <sub>⏱ 15–17</sub>

**Theory speaker:** "Every box is a permission you grant. The blue ones only look. The red ones change the world: a message goes out, money moves." Point at the note: "Reading tools you can hand out freely. Acting tools are where you put a person. Remember that for Demo 2."

## 9 · How we got here  <sub>⏱ 17–19</sub>

**Theory speaker:** One sentence per →, don't linger: "2022, ChatGPT: it answers. 2023: it learns to call functions. 2024: it starts remembering you. 2025: it uses computers and writes code on its own. 2026: agents start talking to other agents." Then: "Notice the last one. In the finale you'll hear two agents negotiate."

## 10 · How to read the demos  <sub>⏱ 19–20</sub>

**Demo speaker:** Thirty seconds, pointing at each column: "Left: the story, in plain words, that's the one to read. Middle: the agent and its tools; every glowing dot is one real tool call; the white bubble is it thinking. Right: what it can see: the data, its memory, and the loop you just saw as code." Then: "Everything is real. We only replay a recording if the Wi-Fi lets us down."

**Cue:** → to Demo 1.

## 11 · Demo 1 · Watch it work  <sub>⏱ 20–28</sub>

*Demo slide: → steps the demo, ▶ plays it, ↺ restarts. The slide only advances when the demo is done.*

**Theory speaker:** Set it up in one line: "Brightloop is a made-up company. Five teams, a budget table, some notes. We ask a question a finance person asks every month."

**Demo speaker:** Press → to step (or ▶ to let it run; → pauses). As it goes, point at: the story on the left; the Atlas row lighting up in the database ("that's where the answer came from"); the calculator ("it doesn't guess maths, it computes"); the file it writes ("real work, not just a reply"); the memory card sliding in; the loop line lighting up on the right ("the eight lines, running"). Then "the next day": one step, straight from memory. "One step instead of four."

**Theory speaker:** In LIVE mode, ask the room: "Give us a question about this company." Suggest if needed: "How many engineers do we have?" or "Can Comet afford DevDays?" **Demo speaker** types it into "Audience question" and presses Ask live. If it stalls: "Switch to replay" and move on.

**Cue:** when the last answer is on screen, → moves to the memory slide.

## 12 · Memory can lie  <sub>⏱ 28–29</sub>

**Theory speaker:** "Remember the notebook? Like a human's, it can be out of date." → first card: "A note with no date and no author. Is it still true? Nobody knows, including the agent." → second card: "A note with receipts: who wrote it, when, from where, and one rule: check before you trust. Watch the difference."

## 13 · Demo 1 · continued  <sub>⏱ 29–33</sub>

*Demo slide: → steps the demo, ▶ plays it, ↺ restarts. The slide only advances when the demo is done.*

**Demo speaker:** First tab, "Trusts memory": step with →. It reads the old note and answers "15 October", confidently wrong, and that date would go into the newsletter. Pause on the answer for a beat.

**Demo speaker:** → switches to "Checks memory". Same question. It sees the note is five months old and written by a bot, checks the project notes, finds the 22 September change, answers 3 November, and fixes its own memory. Point at the new memory entry with its source.

**Theory speaker:** "Same model, same question. The only difference is the rules we gave it: keep receipts, and check before you trust."

## 14 · Demo 2 · Watch it do your work  <sub>⏱ 33–41</sub>

*Demo slide: → steps the demo, ▶ plays it, ↺ restarts. The slide only advances when the demo is done.*

**Theory speaker:** "Monday morning in finance: three invoices in the inbox, three purchase orders in the system. Normally thirty minutes of someone's week. Watch what an agent does with it, and where a person stays in the loop."

**Demo speaker:** Step with →. Point at: the three order rows lighting up as it reads them; the calculator catching the EUR 252 difference on Nordic Office Supply ("it noticed, and it didn't guess the number"); the drafted email on the stage; and the **human check** card: "this is the one message that leaves the building, so a person approves it." Land on the last line of the story: "Nothing has been paid."

**Theory speaker:** "That's the pattern for most office work: the agent does the matching and the drafting, a person signs off on anything that goes out. Reading tools are free, acting tools get a human."

**Cue:** → after the answer moves on.

## 15 · Data vs instructions  <sub>⏱ 41–43</sub>

**Theory speaker:** "One more risk, and it's the big one. The agent reads documents. A document can contain words that look like orders." → the example. "This is called prompt injection. Invoice fraud already works on people by email; it works on an agent too if the agent treats every document as its boss. The fix is the next slide."

## 16 · Three habits  <sub>⏱ 43–45</sub>

**Theory speaker:** One → per card, one line each. "Read, don't obey: documents are data, only you give instructions. Memory with receipts: you saw it fix its own note. A human at the door: you saw the approval card before the email went out." Then: "None of this is exotic. It's the same rules you'd give a new intern."

## 17 · So what for your job  <sub>⏱ 45–48</sub>

**Theory speaker:** Pick the card closest to who's in the room and spend the time there; one line for the other two. Then the last →: "Agents do. Humans approve. If you remember one rule for your own team, make it that one."

**Cue:** hand over to the Demo speaker for the finale.

## 18 · Demo 3 · Hear it act  <sub>⏱ 48–55</sub>

*Demo slide: → steps the demo, ▶ plays it, ↺ restarts. The slide only advances when the demo is done.*

**Theory speaker:** "At the very start, the chatbot couldn't book a dinner. Let's ask the same thing again, out loud, to an agent with hands, a notebook and a loop."

**Demo speaker:** Press → (or ▶) to connect in LIVE mode, wait for "Listening…", then just talk: "Plan a dinner for my team tonight." Let it work; narrate only what's on screen: memory glowing ("it remembers we're eight, one vegetarian, forty euros a head"), pins dropping on the map, the weather card ("rain, so indoors"), then the call: two agents talking out loud. Stay quiet during the call. When the booking card appears: "and the invite is on its way to the team."

**Demo speaker:** If the room is loud, press Mute while the agents talk. If the voice won't connect: "Use replay" plays the recorded run; ▶ pauses and resumes it. Optional if there's time: say "Remember that Aino doesn't eat fish." and point at the memory card.

**Theory speaker:** Close it: "Same kind of AI as the one that said 'I can't'. The difference is hands, a notebook, and a loop."

**Cue:** → after the booking moves on. If the demo ever hangs, press → twice quickly to leave the slide.

## 19 · Frameworks  <sub>⏱ 55–56</sub>

**Theory speaker:** Don't read the grid. "If your team asks what to build with, these are the names to know. Two protocols matter more than any one framework: MCP is how an agent plugs into tools, A2A is how agents call each other, like the restaurant call you just heard." Point at the note: "Our demos used none of them. The loop is eight lines; frameworks add the plumbing."

## 20 · Learn it free  <sub>⏱ 56–57</sub>

**Theory speaker:** "All free, all from the companies that make the models, and the links are on the page you'll scan in a minute. If you do one: the Hugging Face course. If you don't code: Anthropic's AI Fluency courses." Thirty seconds, then the take-home.

## 21 · Take-home  <sub>⏱ 57–58</sub>

**Theory speaker:** Say it slowly; this is the one sentence. → for the second line: "It can also get things wrong in ways you need to watch for. Give it receipts, and keep a human at the door."

## 22 · Q&A  <sub>⏱ 58–60</sub>

**Both:** Take questions. **Demo speaker** repeats each question into the mic so the room hears it; **Theory speaker** answers; the Demo speaker adds what the demo actually did when it's relevant. If the room is quiet, pick one of the three starters on screen and ask it back to them.

**Cue:** → to the thank-you slide when time is up.

## 23 · Speakers  <sub>⏱ 60</sub>

**Both:** "Thank you. These are our LinkedIn and portfolio codes, and the next slide has everything you saw today." Leave it up while people scan.

## 24 · Replay the demos  <sub>⏱ 60</sub>

**Both:** "Everything you saw today is on this page, plus the course links: press play and watch the agent work, do your invoices, and book the dinner." Leave it up until people have scanned.

