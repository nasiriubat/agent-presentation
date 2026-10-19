// Side panels for the tool map: the data it can read, its memory, the loop, and the raw log.

const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const panel = (parent, title) => {
  const box = document.createElement('section');
  box.className = 'tm-panel';
  box.innerHTML = `<h4>${title}</h4>`;
  parent.append(box);
  return box;
};

export class DbPanel {
  constructor(parent, rows) {
    this.box = panel(parent, '🗄️ Company database');
    const table = document.createElement('table');
    table.className = 'tm-db';
    table.innerHTML = '<thead><tr><th>Team</th><th>Budget</th><th>People</th><th>Lead</th></tr></thead><tbody>' +
      rows.map((r) => `<tr data-id="${r.id}"><td>${esc(r.team)}</td><td>€${r.budget_eur.toLocaleString('en-US')}</td><td>${r.people}</td><td>${esc(r.lead)}</td></tr>`).join('') + '</tbody>';
    this.box.append(table);
    this.rows = [...table.querySelectorAll('tbody tr')];
  }

  highlight(ids) {
    for (const tr of this.rows) tr.classList.toggle('tm-hl', ids.includes(Number(tr.dataset.id)));
  }
}

export class MemoryPanel {
  constructor(parent) {
    this.box = panel(parent, '🗂️ Memory');
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
    this.box = panel(parent, '⚙️ The agent loop');
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
    this.box = document.createElement('section');
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
