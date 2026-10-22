// Cold open: a plain chatbot is asked to do something in the world, and can't.
import { loadJson } from './toolmapDemo.js';
import { api as defaultApi } from '../core/api.js';
import { icon } from '../ui/icons.js';
import './demos.css';

const PROMPT = 'Book a dinner for my team tonight.';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function mount(container, { mode = 'replay', api = defaultApi } = {}) {
  const root = document.createElement('div');
  root.className = 'chat-demo';
  root.innerHTML = `<div class="chat-window"><div class="chat-head"><i></i><i></i><i></i><span>${icon('message')} A chatbot</span></div><div class="chat-msgs"></div><div class="chat-input"></div></div>`;
  container.append(root);
  const msgs = root.querySelector('.chat-msgs');
  const input = root.querySelector('.chat-input');
  const replay = await loadJson('replays/coldopen.json');
  let stage = 0;

  const add = (cls, text) => {
    const d = document.createElement('div');
    d.className = `chat-msg ${cls}`;
    d.textContent = text;
    msgs.append(d);
    return d;
  };

  async function type(text) {
    input.classList.add('chat-typing');
    input.style.color = '#0f172a';
    for (let i = 1; i <= text.length; i++) { input.textContent = text.slice(0, i); await sleep(38); }
    await sleep(300);
    input.classList.remove('chat-typing');
    input.textContent = '';
    add('chat-user', text);
  }

  async function answer() {
    const bubble = add('chat-bot', '…');
    let text = replay.find((e) => e.type === 'answer').text;
    if (mode === 'live') {
      try { text = (await api.json('/api/chat/plain', { text: PROMPT })).text || text; } catch {}
    } else await sleep(900);
    bubble.textContent = text;
  }

  return {
    async step() {
      stage++;
      if (stage === 1) { await type(PROMPT); return true; }
      if (stage === 2) { await answer(); return true; }
      return false;
    },
    async autoplay() { while (await this.step()); },
    reset() { stage = 0; msgs.innerHTML = ''; input.textContent = ''; },
  };
}
