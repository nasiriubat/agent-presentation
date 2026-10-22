// Stage pre-flight: every check the talk depends on, green or red, with one click to retest.
import { api } from './core/api.js';
import { validateEvent } from './core/events.js';
import { forcedReplay, setForcedReplay } from './core/modes.js';

const BASE = import.meta.env.BASE_URL;
const box = document.getElementById('checks');
const REPLAYS = ['coldopen', 'demo1-task1', 'memory-unguarded', 'memory-guarded', 'demo2-invoices'];

function row(name, extra = '') {
  const el = document.createElement('div');
  el.className = 'check';
  el.innerHTML = `<span class="st">⏳</span><span class="name">${name}</span>${extra}<span class="detail"></span>`;
  box.append(el);
  return {
    el,
    ok: (d = '') => { el.querySelector('.st').textContent = '✅'; el.querySelector('.detail').textContent = d; },
    bad: (d = '') => { el.querySelector('.st').textContent = '❌'; el.querySelector('.detail').textContent = d; },
    info: (d = '') => { el.querySelector('.st').textContent = '👉'; el.querySelector('.detail').textContent = d; },
  };
}

async function check(name, fn) {
  const r = row(name);
  try { const d = await fn(); r.ok(d); } catch (err) { r.bad(err.message); }
}

async function run() {
  box.innerHTML = '';
  document.getElementById('force').checked = forcedReplay();

  await check('Local server is running', async () => {
    if (!(await api.health(1500)).live) throw new Error('Start it with: npm run stage');
    return 'http://localhost:8787';
  });
  await check('OpenAI key works', async () => {
    const r = await api.json('/api/selftest');
    if (!r.openai) throw new Error(r.error ?? 'key rejected');
    return 'gpt-6-luna answered';
  });
  await check('Voice agent can start (realtime key)', async () => {
    const r = await api.json('/api/realtime/token', { instructions: 'preflight', tools: [] });
    if (!String(r.value ?? '').startsWith('ek_')) throw new Error(JSON.stringify(r).slice(0, 200));
    return 'short-lived key minted';
  });
  await check('Weather for Tampere', async () => {
    const w = await api.json('/api/weather');
    return `${w.tempC}°C, ${w.rainChancePct}% rain${w.cached ? ' (CACHED fallback: no internet?)' : ''}`;
  });
  await check('Replays load and are valid', async () => {
    for (const name of REPLAYS) {
      const events = await (await fetch(`${BASE}replays/${name}.json`)).json();
      events.forEach(validateEvent);
    }
    const finale = await (await fetch(`${BASE}replays/finale/events.json`)).json();
    if (!finale.some((c) => c.m === 'booking')) throw new Error('finale replay has no booking');
    return `${REPLAYS.length} demo replays + finale`;
  });

  const mic = row('Microphone', `<div class="meter"><i></i></div><button type="button" id="mic">Test 5 s</button>`);
  mic.info('Speak into the mic you will use on stage.');
  mic.el.querySelector('#mic').onclick = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const ctx = new AudioContext();
      const an = ctx.createAnalyser();
      ctx.createMediaStreamSource(stream).connect(an);
      const data = new Uint8Array(an.fftSize);
      let peak = 0;
      const bar = mic.el.querySelector('.meter i');
      const end = performance.now() + 5000;
      await new Promise((resolve) => {
        const tick = () => {
          an.getByteTimeDomainData(data);
          const level = Math.max(...data.map((v) => Math.abs(v - 128))) / 128;
          peak = Math.max(peak, level);
          bar.style.width = `${Math.round(level * 100)}%`;
          if (performance.now() < end) requestAnimationFrame(tick); else resolve();
        };
        tick();
      });
      stream.getTracks().forEach((t) => t.stop());
      peak > 0.1 ? mic.ok(`Peak level ${Math.round(peak * 100)}%`) : mic.bad('Very quiet: check the input device in System Settings → Sound');
    } catch (err) { mic.bad(err.message); }
  };

  const spk = row('Speakers: the negotiation voices', `<button type="button" id="spk">Play a voice</button>`);
  spk.info('You should hear the restaurant agent through the room speakers.');
  spk.el.querySelector('#spk').onclick = async () => {
    try {
      const a = new Audio(`${BASE}replays/negotiation-fallback/turn-2.mp3`);
      await a.play();
      spk.ok('Playing… if you heard it, sound is fine.');
    } catch (err) { spk.bad(err.message); }
  };
}

document.getElementById('force').onchange = (e) => setForcedReplay(e.target.checked);
document.getElementById('rerun').onclick = run;
run();
