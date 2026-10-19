// Demo 3: talk to an agent that plans tonight's team dinner, phones the restaurant's agent,
// and texts the Demo speaker's phone. Runs live, or replays a recorded run with its audio.
import { MissionBoard } from './board.js';
import { RealtimeSession } from './session.js';
import { FINALE_TOOLS, createHandlers } from './tools.js';
import { ReplayRecorder } from './recorder.js';
import { api as defaultApi } from '../core/api.js';

const BASE = import.meta.env?.BASE_URL ?? '/';
const asset = (p) => `${BASE}${p}`;

export const FINALE_INSTRUCTIONS = `You are the Demo speaker's personal AI agent, live on stage at a talk in Tampere. Always speak English.
Speak briefly: 1–2 short sentences per turn, warm and confident.
When asked to plan tonight's team dinner: first recall_memory, then search_restaurants using what you remember (vegetarian, budget, party size),
then get_weather, then call_restaurant for the best match, then send_invite to the Demo speaker with the agreed place and time.
Before each tool, say in one short sentence what you're about to do. After the booking, confirm it in one sentence.
If someone asks you to remember something, use save_memory.`;

export const QA_INSTRUCTIONS = `You are the AI agent from the talk "From Answering to Doing" by Nasir and Aidul of GPT-Lab, Tampere University, at Crazytown Tampere.
Always speak English. Answer audience questions about AI agents, tools, memory, risks and the demos in 2–3 spoken sentences.
Politely decline anything off-topic or personal.`;

const loadJson = (p) => fetch(asset(p)).then((r) => { if (!r.ok) throw new Error(p); return r.json(); });

export function mountFinale(container, { mode = 'replay', who = 'aidul', api = defaultApi } = {}) {
  const board = new MissionBoard(container);
  let session, recorder, ctx, mixDest, replay, finished = false, started = false;

  const audioCtx = () => {
    if (!ctx) { ctx = new AudioContext(); mixDest = ctx.createMediaStreamDestination(); }
    return ctx;
  };

  // Plays one negotiation turn through the speakers (and into the recording mix).
  // Never hangs: if the audio engine is blocked, a timer moves the call on.
  async function playClip(base64) {
    const c = audioCtx();
    await c.resume().catch(() => {});
    const bytes = Uint8Array.from(atob(base64), (ch) => ch.charCodeAt(0));
    const buf = await c.decodeAudioData(bytes.buffer);
    const src = c.createBufferSource();
    src.buffer = buf;
    src.connect(c.destination);
    src.connect(mixDest);
    await new Promise((resolve) => {
      const safety = setTimeout(resolve, buf.duration * 1000 + 1500);
      src.onended = () => { clearTimeout(safety); resolve(); };
      src.start();
    });
  }

  // Streams the two-agent call from the server and plays each turn in order.
  function negotiate(request) {
    return new Promise((resolve) => {
      session?.hold();
      board.negotiationStart();
      const queue = [];
      let booking, fallback, ended = false, playing = false;
      const finish = () => {
        board.negotiationEnd();
        session?.release();
        resolve({ booking, fallback });
      };
      const pump = async () => {
        if (playing) return;
        playing = true;
        while (queue.length) {
          const t = queue.shift();
          board.negotiationTurn(t.speaker, t.text);
          try { await playClip(t.audioBase64); } catch { await new Promise((r) => setTimeout(r, 2500)); }
        }
        playing = false;
        if (ended) finish();
      };
      api.sse('/api/negotiate', { request }, (e) => {
        if (e.type === 'negotiation.turn') { queue.push(e); pump(); }
        else if (e.type === 'negotiation.done') { booking = e.booking; fallback = e.fallback; }
        else if (e.type === 'done' || e.type === 'error') {
          ended = true;
          if (!booking) booking = { restaurant: request.restaurant, time: '20:30', seating: 'indoors', partySize: request.partySize, vegetarian: true };
          if (!playing) finish();
        }
      });
    });
  }

  async function startLive(instructions = FINALE_INSTRUCTIONS, withTools = true) {
    const [restaurants, memory] = await Promise.all([loadJson('data/restaurants.json'), loadJson('data/finale-memory.json')]);
    board.memory(memory.map((m) => m.fact), null);
    const handlers = createHandlers({ api, board, data: { restaurants, memory: [...memory] }, negotiate });
    const send_invite = handlers.send_invite;
    handlers.send_invite = async (args) => { const out = await send_invite({ ...args, who }); finished = true; return out; };
    session = new RealtimeSession({
      api, instructions,
      tools: withTools ? FINALE_TOOLS : [],
      handlers: withTools ? handlers : {},
      onTranscript: (role, text) => board.transcript(role, text),
      onToolCall: (name) => board.tool(name, true),
      onToolDone: (name) => board.tool(name, false),
      onState: (s) => board.micState(s),
    });
    board.onMute(() => session.mute(!session.userMuted));
    try {
      await session.connect();
    } catch (err) {
      board.error(`Couldn't start the voice agent: ${err.message}`, { onUseReplay: () => { mode = 'replay'; startReplay(); } });
      return;
    }
    audioCtx();
    if (session.remoteStream) ctx.createMediaStreamSource(session.remoteStream).connect(mixDest);
    ctx.createMediaStreamSource(session.mic).connect(mixDest);
  }

  async function startReplay() {
    board.reset();
    board.micState('idle');
    let events;
    try {
      events = await loadJson('replays/finale/events.json');
    } catch {
      board.error('No recorded run found.');
      return;
    }
    const audio = new Audio(asset('replays/finale/audio.webm'));
    const hasAudio = await new Promise((r) => { audio.oncanplay = () => r(true); audio.onerror = () => r(false); audio.load(); });
    let i = 0, startedAt = performance.now(), stopped = false;
    replay = { stop: () => { stopped = true; audio.pause(); } };
    if (hasAudio) audio.play().catch(() => {});
    const clock = () => (hasAudio && !audio.paused ? audio.currentTime * 1000 : performance.now() - startedAt);
    await new Promise((resolve) => {
      const tick = async () => {
        if (stopped) return resolve();
        while (i < events.length && events[i].t <= clock()) {
          const ev = events[i++];
          if (ev.m === 'clip') { if (!hasAudio) playClipUrl(ev.a[0]); }
          else board[ev.m]?.(...ev.a);
        }
        if (i >= events.length) return resolve();
        requestAnimationFrame(tick);
      };
      tick();
    });
    finished = true;
  }

  function playClipUrl(url) {
    new Audio(asset(url)).play().catch(() => {});
  }

  // Wraps the board so every UI call is logged with its time, for the replay file.
  function startRecording() {
    audioCtx();
    recorder = new ReplayRecorder({ stream: mixDest.stream });
    for (const m of ['transcript', 'tool', 'memory', 'pins', 'weather', 'negotiationStart', 'negotiationTurn', 'negotiationEnd', 'booking', 'invite', 'micState']) {
      const orig = board[m].bind(board);
      board[m] = (...a) => { recorder.log(m, a); return orig(...a); };
    }
    recorder.start();
  }

  return {
    board,
    get finished() { return finished; },
    async arm() {},
    // First press starts the demo; it stays on the slide until the run has finished.
    async step() {
      audioCtx().resume().catch(() => {}); // created inside the presenter's key press or click
      if (!started) { started = true; mode === 'live' ? await startLive() : startReplay(); return true; }
      return !finished;
    },
    async autoplay() { started = true; await startReplay(); },
    startQa: () => startLive(QA_INSTRUCTIONS, false),
    startRecording,
    stopRecording: () => recorder?.stop(),
    reset() {
      replay?.stop();
      session?.close();
      session = null;
      started = false; finished = false;
      board.reset();
      board.micState('idle');
    },
  };
}
