// Side panels for the tool map: the story so far, the data it can read, its memory, the loop, and the raw log.
import { icon } from '../ui/icons.js';

const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// Panels are <div>s on purpose: reveal.js treats any <section> inside a slide as a vertical sub-slide.
const panel = (parent, iconName, title, cls = '') => {
  const box = document.createElement('div');
  box.className = `tm-panel ${cls}`.trim();
  box.innerHTML = `<h4>${icon(iconName)}<span>${title}</span></h4>`;
  parent.append(box);
  return box;
};

// What each story role looks like: an icon and a label for screen readers.
const ROLE = {
  user: ['user', 'You'], think: ['brain', 'Thinks'], tool: ['wrench', 'Acts'], memory: ['notebook', 'Memory'], file: ['file', 'Writes'],
  warn: ['warning', 'Warning'], guard: ['shield', 'Guard'], human: ['human', 'Human check'], answer: ['check', 'Answer'], section: ['repeat', ''],
};

// The plain-English account of the run, as a chat-like list that grows while the agent works.
export class StoryPanel {
  constructor(parent, { toolIcons = {} } = {}) {
    this.box = panel(parent, 'message', 'What is happening', 'tm-story');
    this.list = document.createElement('ol');
    this.list.className = 'tm-story-list';
    this.box.append(this.list);
    this.toolIcons = toolIcons;
    this.count = 0;
  }

  render(story) {
    // Only append what is new, so entries keep their entrance animation and the list doesn't flicker.
    if (story.length < this.count) { this.list.innerHTML = ''; this.count = 0; }
    for (let i = this.count; i < story.length; i++) this.list.append(this.item(story[i]));
    this.count = story.length;
    // a tool entry flips to "done" in place
    [...this.list.children].forEach((li, i) => {
      li.classList.toggle('tm-done', Boolean(story[i]?.done));
      li.classList.toggle('tm-latest', i === story.length - 1);
    });
    this.list.lastElementChild?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  item(e) {
    const li = document.createElement('li');
    const [ic, label] = ROLE[e.role] ?? ['sparkles', ''];
    li.className = `tm-story-item tm-role-${e.role}${e.danger ? ' tm-danger' : ''}`;
    const iconName = e.role === 'tool' ? (this.toolIcons[e.tool] ?? ic) : ic;
    li.innerHTML = `${icon(iconName)}<span class="tm-story-text">${label ? `<span class="sr-only">${label}: </span>` : ''}${esc(e.text)}</span>${e.role === 'tool' ? `<span class="tm-story-done">${icon('check')}</span>` : ''}`;
    return li;
  }
}

// A small table the agent can read from. db: {title?, icon?, columns: [{key, label, money?}], rows: [{id, ...}]}
// or, for the original team table, just the rows.
export const TEAM_TABLE = {
  title: 'Company database', icon: 'database',
  columns: [{ key: 'team', label: 'Team' }, { key: 'budget_eur', label: 'Budget', money: true }, { key: 'people', label: 'People' }, { key: 'lead', label: 'Lead' }],
};
export class DbPanel {
  constructor(parent, db) {
    const { title, icon: ic, columns, rows } = Array.isArray(db) ? { ...TEAM_TABLE, rows: db } : { ...TEAM_TABLE, ...db };
    this.box = panel(parent, ic, title);
    const table = document.createElement('table');
    table.className = 'tm-db';
    const cell = (r, c) => (c.money ? `€${Number(r[c.key]).toLocaleString('en-US')}` : esc(r[c.key] ?? ''));
    table.innerHTML = `<thead><tr>${columns.map((c) => `<th>${esc(c.label)}</th>`).join('')}</tr></thead><tbody>` +
      rows.map((r) => `<tr data-id="${r.id}">${columns.map((c) => `<td>${cell(r, c)}</td>`).join('')}</tr>`).join('') + '</tbody>';
    this.box.append(table);
    this.rows = [...table.querySelectorAll('tbody tr')];
  }

  highlight(ids) {
    for (const tr of this.rows) tr.classList.toggle('tm-hl', ids.includes(Number(tr.dataset.id)));
  }
}

export class MemoryPanel {
  constructor(parent) {
    this.box = panel(parent, 'notebook', 'Memory');
    this.list = document.createElement('ul');
    this.list.className = 'tm-mem';
    this.box.append(this.list);
  }

  render(entries) {
    this.list.innerHTML = entries.length
      ? entries.map((m) => `<li class="${m.glow ? 'tm-glow' : ''} ${m.isNew ? 'tm-new' : ''}">${esc(m.fact)}${m.source ? `<small>from ${esc(m.source)}${m.recorded_at ? ` · ${esc(m.recorded_at)}` : ''}</small>` : ''}</li>`).join('')
      : '<li class="tm-empty">empty</li>';
  }
}

export class CodePanel {
  constructor(parent, code) {
    this.box = panel(parent, 'repeat', 'The agent loop');
    const pre = document.createElement('pre');
    pre.className = 'tm-code';
    pre.innerHTML = code.trimEnd().split('\n').map((l, i) => `<span data-line="${i + 1}">${esc(l) || ' '}</span>`).join('\n');
    this.box.append(pre);
    this.lines = [...pre.querySelectorAll('span')];
  }

  highlight(n) {
    for (const s of this.lines) s.classList.toggle('tm-run', Number(s.dataset.line) === n);
  }
}

export class LogPanel {
  constructor(parent) {
    this.box = document.createElement('div');
    this.box.className = 'tm-log';
    this.box.innerHTML = '<h4>What really happened</h4><div class="tm-log-body"></div>';
    parent.append(this.box);
    this.body = this.box.querySelector('.tm-log-body');
  }

  render(log) {
    this.body.innerHTML = log.map((l) => `<div><b>${esc(l.kind ?? '')}</b> ${esc(String(l.text ?? '').slice(0, 400))}</div>`).join('');
    this.body.scrollTop = this.body.scrollHeight;
  }
}
