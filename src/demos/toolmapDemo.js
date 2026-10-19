// Shared shell for the tool-map demos: tabs (e.g. Unguarded / Guarded), controls, replay or live.
import { ToolMap } from '../toolmap/toolmap.js';
import { EventPlayer } from '../core/player.js';
import { api as defaultApi } from '../core/api.js';
import './demos.css';

const BASE = import.meta.env?.BASE_URL ?? '/';
export const asset = (p) => `${BASE}${p}`;
export const loadJson = (p) => fetch(asset(p)).then((r) => { if (!r.ok) throw new Error(`${p}: ${r.status}`); return r.json(); });
export const loadText = (p) => fetch(asset(p)).then((r) => r.text());

// tabs: [{id, label, replay: 'replays/x.json', memory?: entries, intro?: html}]
export function toolmapDemo(container, { tools, panels = {}, tabs, mode = 'replay', live, overlay, api = defaultApi }) {
  const root = document.createElement('div');
  root.className = 'demo';
  root.innerHTML = `
    <div class="demo-bar">
      <div class="demo-tabs">${tabs.length > 1 ? tabs.map((t) => `<button type="button" data-tab="${t.id}">${t.label}</button>`).join('') : ''}</div>
      <div class="demo-tools">
        ${live ? `<form class="demo-ask"><input placeholder="Audience question…" aria-label="Audience question"><button type="submit">Ask live</button></form>` : ''}
        <button type="button" data-act="play" title="Play">▶</button>
        <button type="button" data-act="reset" title="Restart">↺</button>
        <button type="button" data-act="log" title="What really happened">{ }</button>
        ${live ? '<button type="button" data-act="record" title="Download this run as a replay">⤓</button>' : ''}
      </div>
    </div>
    <div class="demo-body"></div>
    <div class="demo-stall"><span>The live run is stuck.</span><button type="button">Switch to replay</button></div>`;
  container.append(root);
  const body = root.querySelector('.demo-body');
  let tab = tabs[0], map, player, events = [], liveRun, liveEvents = [], stallTimer, overlayEl;
  let liveState = null; // null | 'running' | 'done' — a live run replaces the replay on this tab

  async function setTab(t) {
    tab = t;
    liveRun?.abort();
    liveState = null;
    root.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('on', b.dataset.tab === t.id));
    body.innerHTML = '';
    map = new ToolMap(body, { tools: tools.map((x) => ({ ...x })), panels: { ...panels, memory: t.memory ?? panels.memory } });
    events = await loadJson(t.replay);
    player = new EventPlayer(events, (e) => map.handle(e));
    if (overlay) {
      overlayEl = document.createElement('div');
      overlayEl.className = 'demo-overlay';
      overlayEl.innerHTML = overlay(t);
      body.append(overlayEl);
    }
  }

  const ready = setTab(tab);

  function dismissOverlay() {
    if (overlayEl) { overlayEl.remove(); overlayEl = null; return true; }
    return false;
  }

  function armStall() {
    clearTimeout(stallTimer);
    stallTimer = setTimeout(() => root.classList.add('demo-stalled'), 20000);
  }

  async function runLive(question) {
    dismissOverlay();
    player.reset();
    map.reset();
    liveEvents = [];
    root.classList.remove('demo-stalled');
    liveState = 'running';
    const queue = [];
    let draining = false;
    const drain = async () => {
      if (draining) return;
      draining = true;
      while (queue.length) await map.handle(queue.shift());
      draining = false;
    };
    armStall();
    liveRun = api.sse(live.path, live.body(question), (e) => {
      if (e.type === 'done') { clearTimeout(stallTimer); liveState = 'done'; return; }
      if (e.type === 'error') { root.classList.add('demo-stalled'); clearTimeout(stallTimer); liveState = 'done'; return; }
      if (e.type === 'answer' && e.error) root.classList.add('demo-stalled');
      armStall();
      liveEvents.push(e);
      queue.push(e);
      drain();
    });
  }

  root.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => setTab(tabs.find((t) => t.id === b.dataset.tab))));
  root.querySelector('[data-act="play"]').onclick = () => { dismissOverlay(); player.autoplay(); };
  root.querySelector('[data-act="reset"]').onclick = () => setTab(tab);
  root.querySelector('[data-act="log"]').onclick = () => map.toggleLog();
  root.querySelector('[data-act="record"]')?.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(liveEvents.map((e, i) => ({ ...e, t: i * 1200 })), null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'live-run.json';
    a.click();
  });
  root.querySelector('.demo-stall button').onclick = () => { liveRun?.abort(); root.classList.remove('demo-stalled'); setTab(tab); };
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

  return {
    ready,
    // Advances one presenter step. Returns false when the current tab has finished.
    async step() {
      await ready;
      if (liveState === 'running') return true; // don't replay over a live answer that is still coming
      if (liveState === 'done') return false;
      if (dismissOverlay()) return true;
      if (player.done) {
        const i = tabs.indexOf(tab);
        if (i < tabs.length - 1) { await setTab(tabs[i + 1]); return true; }
        return false;
      }
      await player.step();
      return true;
    },
    async autoplay() { await ready; dismissOverlay(); await player.autoplay(); },
    reset() { liveRun?.abort(); clearTimeout(stallTimer); return setTab(tabs[0]); },
    runLive,
    get map() { return map; },
  };
}
