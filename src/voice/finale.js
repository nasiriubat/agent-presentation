// Demo 3: talk to an agent that plans tonight's team dinner, phones the restaurant's agent,
// and texts the Demo speaker's phone. Runs live, or replays a recorded run with its audio.
import { MissionBoard } from './board.js';
import { RealtimeSession } from './session.js';
import { FINALE_TOOLS, createHandlers } from './tools.js';
import { ReplayRecorder } from './recorder.js';
import { api as defaultApi } from '../core/api.js';
import { createNegotiator } from './negotiate.js';
import { exitGate } from './exitGate.js';
import { icon } from '../ui/icons.js';

const BASE = import.meta.env?.BASE_URL ?? '/';
const asset = (p) => `${BASE}${p}`;

export const FINALE_INSTRUCTIONS = `You are the Demo speaker's personal AI agent, live on stage at a talk in Tampere. Always speak English.
Speak briefly: 1–2 short sentences per turn, warm and confident.
When asked to plan tonight's team dinner: first recall_memory, then search_restaurants using what you remember (vegetarian, budget, party size),
then get_weather, then call_restaurant for the best match, then send_invite to the team with the agreed place and time.
Before each tool, say in one short sentence what you're about to do. After the booking, confirm it in one sentence.
If someone asks you to remember something, use save_memory.`;

const loadJson = (p) => fetch(asset(p)).then((r) => { if (!r.ok) throw new Error(p); return r.json(); });

export function mountFinale(container, { mode = 'replay', api = defaultApi } = {}) {
  // a control bar above the board: play/pause and restart for the replay, "use replay" while live
  const bar = document.createElement('div');
  bar.className = 'finale-bar';
  bar.innerHTML = `<span class="finale-mode">${mode === 'live' ? `${icon('mic')} Live voice` : `${icon('play')} Recorded run`}</span>
    <div class="finale-tools">
      ${mode === 'live' ? `<button type="button" data-act="replay" title="Stop the live voice and play the recording">${icon('play')} Use replay</button>` : ''}
      <button type="button" data-act="play" title="Play" aria-label="Play">${icon('play')}</button>
      <button type="button" data-act="reset" title="Restart" aria-label="Restart">${icon('rotate')}</button>
    </div>`;
  const host = document.createElement('div');
  host.className = 'finale-host';
  container.append(bar, host);
  const board = new MissionBoard(host);
  const leave = exitGate(1500);
  let session, recorder, ctx, mixDest, replay, finished = false, started = false;
  const playBtn = bar.querySelector('[data-act="play"]');
  const setPlaying = (on) => { playBtn.innerHTML = on ? icon('pause') : icon('play'); playBtn.title = playBtn.ariaLabel = on ? 'Pause' : 'Play'; };

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

  async function playUrl(url) {
    const res = await fetch(asset(url));
    const buf = new Uint8Array(await res.arrayBuffer());
    let bin = '';
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    await playClip(btoa(bin));
  }

  const negotiate = createNegotiator({
    api, board, playBase64: playClip, playUrl,
    loadFallback: () => loadJson('replays/negotiation-fallback.json'),
    hold: () => session?.hold(), release: () => session?.release(),
  });

  async function startLive(instructions = FINALE_INSTRUCTIONS, withTools = true) {
    const [restaurants, memory] = await Promise.all([loadJson('data/restaurants.json'), loadJson('data/finale-memory.json')]);
    board.memory(memory.map((m) => m.fact), null);
    const handlers = createHandlers({ api, board, data: { restaurants, memory: [...memory] }, negotiate });
    const send_invite = handlers.send_invite;
    handlers.send_invite = async (args) => { const out = await send_invite(args); finished = true; return out; };
    session = new RealtimeSession({
      api, instructions,
      tools: withTools ? FINALE_TOOLS : [],
      handlers: withTools ? handlers : {},
      onTranscript: (role, text) => board.transcript(role, text),
      onToolCall: (name) => board.tool(name, true),
      onToolDone: (name) => board.tool(name, false),
      onState: (s) => board.micState(s),
      onError: (message) => board.error(`Voice problem: ${message}`, { onUseReplay: useReplay }),
    });
    board.onMute(() => session.mute(!session.userMuted));
    try {
      await session.connect();
    } catch (err) {
      board.error(`Couldn't start the voice agent: ${err.message}`, { onUseReplay: useReplay });
      return;
    }
    audioCtx();
    if (session.remoteStream) ctx.createMediaStreamSource(session.remoteStream).connect(mixDest);
    ctx.createMediaStreamSource(session.mic).connect(mixDest);
  }

  function useReplay() {
    session?.close();
    session = null;
    mode = 'replay';
    startReplay();
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
    // a missing or unsupported recording must never hang the replay (phones may fire neither event)
    const hasAudio = await new Promise((r) => {
      const giveUp = setTimeout(() => r(false), 3000);
      audio.oncanplay = () => { clearTimeout(giveUp); r(true); };
      audio.onerror = () => { clearTimeout(giveUp); r(false); };
      audio.load();
    });
    let i = 0, startedAt = performance.now(), stopped = false, pausedAt = null, pausedFor = 0;
    replay = {
      stop: () => { stopped = true; audio.pause(); clip?.pause(); },
      pause: () => { if (pausedAt !== null) return; pausedAt = performance.now(); audio.pause(); clip?.pause(); setPlaying(false); },
      resume: () => { if (pausedAt === null) return; pausedFor += performance.now() - pausedAt; pausedAt = null; if (hasAudio) audio.play().catch(() => {}); clip?.play().catch(() => {}); setPlaying(true); },
      get paused() { return pausedAt !== null; },
    };
    setPlaying(true);
    if (hasAudio) audio.play().catch(() => {});
    const clock = () => (hasAudio ? audio.currentTime * 1000 : performance.now() - startedAt - pausedFor);
    await new Promise((resolve) => {
      const tick = () => {
        if (stopped) return resolve();
        if (pausedAt === null) {
          while (i < events.length && events[i].t <= clock()) {
            const ev = events[i++];
            if (ev.m === 'clip') { if (!hasAudio) playClipUrl(ev.a[0]); }
            else board[ev.m]?.(...ev.a);
          }
          if (i >= events.length) return resolve();
        }
        requestAnimationFrame(tick);
      };
      tick();
    });
    setPlaying(false);
    finished = true;
  }

  let clip = null; // the negotiation turn currently playing when the run has no full recording
  function playClipUrl(url) {
    clip = new Audio(asset(url));
    clip.play().catch(() => {});
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

  bar.querySelector('[data-act="replay"]')?.addEventListener('click', (ev) => { ev.currentTarget.blur(); started = true; leave(); useReplay(); });
  playBtn.onclick = () => {
    playBtn.blur();
    if (!started) { started = true; leave(); audioCtx().resume().catch(() => {}); mode === 'live' ? startLive() : startReplay(); return; }
    if (replay?.paused) replay.resume(); else replay?.pause();
  };
  bar.querySelector('[data-act="reset"]').onclick = (ev) => { ev.currentTarget.blur(); api_reset(); };
  function api_reset() {
    replay?.stop();
    replay = null;
    session?.close();
    session = null;
    started = false; finished = false;
    board.reset();
    board.micState('idle');
    setPlaying(false);
  }

  return {
    board,
    get finished() { return finished; },
    async arm() {},
    // Leaving the slide: pause a replay, hang up a live session. State stays so a stray ← costs nothing.
    pause() { if (replay) replay.pause(); if (session) { session.close(); session = null; finished = true; } },
    // First press starts the demo; it stays on the slide until the run has finished,
    // or the presenter presses → twice quickly (escape hatch if the agent never finishes).
    async step() {
      audioCtx().resume().catch(() => {}); // created inside the presenter's key press or click
      if (!started) { started = true; leave(); mode === 'live' ? await startLive() : startReplay(); return true; }
      if (replay?.paused) { replay.resume(); return true; } // → after a pause carries on
      return !(finished || leave());
    },
    async autoplay() { started = true; await startReplay(); },
    startRecording,
    stopRecording: () => recorder?.stop(),
    reset: api_reset,
  };
}
