// Shared shell for the tool-map demos: tabs (e.g. Unguarded / Guarded), controls, replay or live.
// One state machine drives everything: idle → playing (autoplay) → paused → done, with presenter
// steps (→) and the buttons never fighting each other.
import { ToolMap } from '../toolmap/toolmap.js';
import { EventPlayer } from '../core/player.js';
import { api as defaultApi } from '../core/api.js';
import { icon } from '../ui/icons.js';
import './demos.css';

const BASE = import.meta.env?.BASE_URL ?? '/';
export const asset = (p) => `${BASE}${p}`;
export const loadJson = (p) => fetch(asset(p)).then((r) => { if (!r.ok) throw new Error(`${p}: ${r.status}`); return r.json(); });
export const loadText = (p) => fetch(asset(p)).then((r) => r.text());

// tabs: [{id, label, replay: 'replays/x.json', memory?: entries}]
export function toolmapDemo(container, { tools, panels = {}, tabs, mode = 'replay', live, overlay, api = defaultApi }) {
  const root = document.createElement('div');
  root.className = 'demo';
  root.innerHTML = `
    <div class="demo-bar">
      <div class="demo-tabs">${tabs.length > 1 ? tabs.map((t) => `<button type="button" data-tab="${t.id}">${t.label}</button>`).join('') : ''}</div>
      <div class="demo-tools">
        ${live ? `<form class="demo-ask"><input placeholder="Audience question…" aria-label="Audience question"><button type="submit">Ask live</button></form>` : ''}
        <button type="button" data-act="play" title="Play" aria-label="Play">${icon('play')}</button>
        <button type="button" data-act="reset" title="Restart this demo" aria-label="Restart this demo">${icon('rotate')}</button>
        <button type="button" data-act="log" title="What really happened (the raw tool calls)" aria-label="What really happened">${icon('braces')}</button>
        ${live ? `<button type="button" data-act="record" title="Download this run as a replay" aria-label="Download this run as a replay">${icon('download')}</button>` : ''}
      </div>
    </div>
    <div class="demo-body"></div>
    <div class="demo-stall"><span>The live run is stuck.</span><button type="button">Switch to replay</button></div>`;
  container.append(root);
  const body = root.querySelector('.demo-body');
  const playBtn = root.querySelector('[data-act="play"]');
  let tab = tabs[0], map, player, liveRun, liveEvents = [], stallTimer, overlayEl;
  let liveState = null; // null | 'running' | 'done' — a live run replaces the replay on this tab
  let playing = false;
  let chain = Promise.resolve(); // steps and autoplay run one after another, never over each other

  const setPlaying = (on) => {
    playing = on;
    playBtn.innerHTML = on ? icon('pause') : icon('play');
    playBtn.title = playBtn.ariaLabel = on ? 'Pause' : 'Play';
    root.classList.toggle('demo-playing', on);
  };
  const queue = (fn) => { chain = chain.then(fn, fn); return chain; };

  async function setTab(t) {
    tab = t;
    player?.stop();
    setPlaying(false);
    liveRun?.abort();
    liveState = null;
    root.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('on', b.dataset.tab === t.id));
    body.innerHTML = '';
    overlayEl = null;
    map = new ToolMap(body, { tools: tools.map((x) => ({ ...x })), panels: { ...panels, memory: t.memory ?? panels.memory } });
    const events = await loadJson(t.replay);
    const m = map;
    player = new EventPlayer(events, (e) => (map === m ? m.handle(e) : undefined)); // a reset mid-run orphans the old player
    if (overlay) {
      overlayEl = document.createElement('div');
      overlayEl.className = 'demo-overlay';
      overlayEl.innerHTML = overlay(t);
      body.append(overlayEl);
    }
  }

  let ready = setTab(tab);

  function dismissOverlay() {
    if (overlayEl) { overlayEl.remove(); overlayEl = null; return true; }
    return false;
  }

  function armStall() {
    clearTimeout(stallTimer);
    stallTimer = setTimeout(() => root.classList.add('demo-stalled'), 20000);
  }

  async function runLive(question) {
    await ready;
    player.stop();
    setPlaying(false);
    dismissOverlay();
    player.reset();
    map.reset();
    liveEvents = [];
    root.classList.remove('demo-stalled');
    liveState = 'running';
    const pending = [];
    let draining = false;
    const drain = async () => {
      if (draining) return;
      draining = true;
      while (pending.length) await map.handle(pending.shift());
      draining = false;
    };
    armStall();
    liveRun = api.sse(live.path, live.body(question), (e) => {
      if (e.type === 'done') { clearTimeout(stallTimer); liveState = 'done'; return; }
      if (e.type === 'error') { root.classList.add('demo-stalled'); clearTimeout(stallTimer); liveState = 'done'; return; }
      if (e.type === 'answer' && e.error) root.classList.add('demo-stalled');
      armStall();
      liveEvents.push(e);
      pending.push(e);
      drain();
    });
  }

  // Autoplay from wherever the demo is; resolves when it reaches the end or is paused.
  function autoplay() {
    return queue(async () => {
      await ready;
      if (liveState || player.done) return;
      dismissOverlay();
      setPlaying(true);
      const p = player;
      await p.autoplay();
      if (player === p) setPlaying(false);
    });
  }

  function pause() {
    player?.stop();
    setPlaying(false);
  }

  const blur = (b) => b.blur(); // keep keyboard focus with the deck, not the button
  root.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => { blur(b); ready = setTab(tabs.find((t) => t.id === b.dataset.tab)); }));
  playBtn.onclick = () => { blur(playBtn); playing ? pause() : autoplay(); };
  root.querySelector('[data-act="reset"]').onclick = (ev) => { blur(ev.currentTarget); ready = setTab(tab); };
  root.querySelector('[data-act="log"]').onclick = (ev) => { blur(ev.currentTarget); map?.toggleLog(); };
  root.querySelector('[data-act="record"]')?.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(liveEvents.map((e, i) => ({ ...e, t: i * 1200 })), null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'live-run.json';
    a.click();
  });
  root.querySelector('.demo-stall button').onclick = () => { liveRun?.abort(); root.classList.remove('demo-stalled'); ready = setTab(tab); };
  const form = root.querySelector('.demo-ask');
  if (form) {
    form.onsubmit = (ev) => {
      ev.preventDefault();
      const q = form.querySelector('input').value.trim();
      if (q) runLive(q);
    };
    form.querySelector('input').addEventListener('keydown', (ev) => ev.stopPropagation()); // typing must not change slides
    if (mode !== 'live') form.hidden = true;
  }

  const onLastTab = () => tabs.indexOf(tab) === tabs.length - 1;

  return {
    get ready() { return ready; },
    // true once every tab has played to the end (or a live run finished)
    get finished() { return liveState === 'done' || Boolean(player?.done && onLastTab()); },
    // Advances one presenter step. Returns false when the whole demo has finished.
    step() {
      if (playing) { pause(); return Promise.resolve(true); } // → while autoplaying just pauses
      return queue(async () => {
        await ready;
        if (liveState === 'running') return true; // don't replay over a live answer that is still coming
        if (liveState === 'done') return false;
        if (dismissOverlay()) return true;
        if (player.done) {
          if (onLastTab()) return false;
          ready = setTab(tabs[tabs.indexOf(tab) + 1]);
          await ready;
          return true;
        }
        await player.step();
        return true;
      });
    },
    autoplay,
    pause,
    reset() { liveRun?.abort(); clearTimeout(stallTimer); ready = setTab(tabs[0]); return ready; },
    runLive,
    get map() { return map; },
  };
}
