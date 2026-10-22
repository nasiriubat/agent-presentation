// The finale's mission board: conversation on the left, the agent's work on the right.
import { icon } from '../ui/icons.js';
import './board.css';

const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const TOOLS = [
  ['recall_memory', 'notebook', 'Memory', ['save_memory']],
  ['search_restaurants', 'utensils', 'Restaurants'],
  ['get_weather', 'weather', 'Weather'],
  ['call_restaurant', 'phone', 'Call restaurant'],
  ['send_invite', 'send', 'Message'],
];

// A stylised Tampere: Näsijärvi to the north, Pyhäjärvi to the south, the Tammerkoski rapids between.
const MAP_SVG = `<svg viewBox="0 0 100 100" preserveAspectRatio="none" class="mb-map-svg" aria-hidden="true">
  <path d="M0,0 H100 V22 C80,30 62,18 50,24 C38,30 20,20 0,28 Z" class="mb-lake"/>
  <path d="M0,100 H100 V82 C84,74 70,88 54,84 C36,80 22,92 0,84 Z" class="mb-lake"/>
  <path d="M51,25 C49,40 53,55 50,83" class="mb-river"/>
  <text x="70" y="12" class="mb-lake-label">Näsijärvi</text><text x="8" y="95" class="mb-lake-label">Pyhäjärvi</text>
  <text x="53" y="60" class="mb-lake-label">Tammerkoski</text>
</svg>`;

export class MissionBoard {
  constructor(container) {
    this.root = document.createElement('div');
    this.root.className = 'mb';
    this.root.innerHTML = `
      <div class="mb-chat">
        <div class="mb-transcript"></div>
        <div class="mb-mic"><div class="mb-wave"><i></i><i></i><i></i><i></i><i></i></div><span class="mb-mic-label">Not connected</span><button class="mb-mute" type="button">Mute</button></div>
      </div>
      <div class="mb-work">
        <div class="mb-strip">${TOOLS.map(([id, ic, label]) => `<div class="mb-chip" data-tool="${id}">${icon(ic)}<span>${label}</span></div>`).join('')}</div>
        <div class="mb-grid">
          <div class="mb-mapbox">${MAP_SVG}<div class="mb-pins"></div>
            <div class="mb-call"><div class="mb-call-head"><div class="mb-party" data-speaker="yours">${icon('user')} Your agent</div><div class="mb-party" data-speaker="restaurant">${icon('utensils')} Restaurant agent</div></div><div class="mb-call-lines"></div></div>
          </div>
          <div class="mb-cards">
            <div class="mb-card mb-memory"><h4>${icon('notebook')}<span>Memory</span></h4><ul></ul></div>
            <div class="mb-card mb-weather mb-dim"><h4>${icon('weather')}<span>Tonight</span></h4><div class="mb-weather-body">not checked yet</div></div>
            <div class="mb-card mb-booking mb-dim"><h4>${icon('calendar')}<span>Booking</span></h4><div class="mb-booking-body">nothing booked yet</div></div>
          </div>
        </div>
      </div>
      <div class="mb-error"></div>`;
    container.append(this.root);
    this.$ = (sel) => this.root.querySelector(sel);
    this.chips = Object.fromEntries([...this.root.querySelectorAll('.mb-chip')].map((c) => [c.dataset.tool, c]));
    for (const [id, , , aliases = []] of TOOLS) for (const a of aliases) this.chips[a] = this.chips[id];
    this.facts = [];
  }

  onMute(handler) {
    this.$('.mb-mute').onclick = handler;
  }

  reset() {
    this.$('.mb-transcript').innerHTML = '';
    this.$('.mb-pins').innerHTML = '';
    this.$('.mb-call-lines').innerHTML = '';
    this.root.classList.remove('mb-calling');
    this.$('.mb-weather').classList.add('mb-dim');
    this.$('.mb-weather-body').textContent = 'not checked yet';
    this.$('.mb-booking').classList.add('mb-dim');
    this.$('.mb-booking-body').textContent = 'nothing booked yet';
    this.$('.mb-error').classList.remove('mb-show');
    this.memory([], null);
  }

  transcript(role, text) {
    const t = this.$('.mb-transcript');
    const div = document.createElement('div');
    div.className = `mb-msg mb-${role}`;
    div.textContent = text;
    t.append(div);
    t.scrollTop = t.scrollHeight;
  }

  tool(name, on) {
    this.chips[name]?.classList.toggle('mb-on', on);
    if (on && name !== 'call_restaurant') this.transcript('tool', `→ ${name.replace(/_/g, ' ')}`);
  }

  memory(facts, glow) {
    this.facts = facts;
    this.$('.mb-memory ul').innerHTML = facts.map((f, i) => `<li class="${glow === 'all' || glow === i ? 'mb-glow' : ''}">${esc(f)}</li>`).join('') || '<li class="mb-empty">empty</li>';
  }

  pins(restaurants, matchIds = []) {
    this.$('.mb-pins').innerHTML = restaurants.map((r, i) => `<div class="mb-pin ${matchIds.includes(r.id) ? 'mb-match' : 'mb-miss'}" style="left:${r.x}%;top:${r.y}%;animation-delay:${i * 120}ms" data-id="${r.id}">
      <span class="mb-pin-dot"></span><span class="mb-pin-label">${esc(r.name)}<small>€${r.pricePerPerson} · ${r.vegetarian ? 'veg ✓' : 'no veg'}</small></span></div>`).join('');
  }

  weather(w) {
    this.$('.mb-weather').classList.remove('mb-dim');
    this.$('.mb-weather-body').innerHTML = `<b>${Math.round(w.tempC)}°C</b> ${w.rainChancePct}% rain<br>${esc(w.summary)}${w.cached ? ' <small>(cached)</small>' : ''}`;
  }

  negotiationStart() {
    this.root.classList.add('mb-calling');
    this.$('.mb-call-lines').innerHTML = '';
  }

  negotiationTurn(speaker, text) {
    for (const p of this.root.querySelectorAll('.mb-party')) p.classList.toggle('mb-speaking', p.dataset.speaker === speaker);
    const line = document.createElement('div');
    line.className = `mb-line mb-line-${speaker}`;
    line.textContent = text;
    const box = this.$('.mb-call-lines');
    box.append(line);
    box.scrollTop = box.scrollHeight;
  }

  negotiationEnd() {
    for (const p of this.root.querySelectorAll('.mb-party')) p.classList.remove('mb-speaking');
    setTimeout(() => this.root.classList.remove('mb-calling'), 1200);
  }

  booking(b) {
    this.$('.mb-booking').classList.remove('mb-dim');
    this.$('.mb-booking').classList.add('mb-pop');
    this.$('.mb-booking-body').innerHTML = `<b>${esc(b.restaurant)}</b><br>Tonight ${esc(b.time)} · ${esc(b.seating)}<br>${b.partySize} people · vegetarian menu ${icon('check')}<div class="mb-invite"></div>`;
  }

  // The message the team receives, shown under the booking like a sent chat bubble.
  invite({ text = '' } = {}) {
    const el = this.$('.mb-invite');
    if (el) el.innerHTML = `<span class="mb-invite-head">${icon('send')} Invite sent to the team</span>${text ? `<span class="mb-invite-text">${esc(text)}</span>` : ''}`;
  }

  micState(state) {
    this.root.dataset.mic = state;
    this.$('.mb-mic-label').textContent = { listening: 'Listening…', muted: 'Mic muted', speaking: 'Agent speaking', error: 'Voice error', idle: 'Not connected' }[state] ?? state;
    this.$('.mb-mute').textContent = state === 'muted' ? 'Unmute' : 'Mute';
  }

  error(message, { onUseReplay } = {}) {
    const box = this.$('.mb-error');
    box.innerHTML = `<div><b>${esc(message)}</b><p>The demo can continue from the recorded run.</p><button type="button">Use replay</button></div>`;
    box.classList.add('mb-show');
    box.querySelector('button').onclick = () => { box.classList.remove('mb-show'); onUseReplay?.(); };
    this.micState('error');
  }
}
