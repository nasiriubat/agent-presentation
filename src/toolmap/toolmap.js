// The "tool map": the agent in the middle, its tools around it, a glowing dot for every call.
import { initialState, reduceState, stripMarkdown } from './state.js';
import { DbPanel, MemoryPanel, CodePanel, LogPanel } from './panels.js';
import './toolmap.css';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html !== undefined) n.innerHTML = html; return n; };
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export { esc };

// Hand-placed tool positions (percent of the stage) that keep the centre and caption clear.
const LAYOUTS = {
  3: [[20, 24], [80, 24], [80, 68]],
  4: [[20, 24], [80, 24], [80, 68], [20, 68]],
  5: [[18, 22], [50, 13], [82, 22], [82, 68], [18, 68]],
};
const ellipse = (i, n) => {
  const a = Math.PI * (1.15 + (1.7 * i) / Math.max(1, n - 1));
  return [50 + 36 * Math.cos(a), 46 + 31 * Math.sin(a)];
};

export class ToolMap {
  // tools: [{id, label, icon}]; panels: {db?: rows, memory?: entries, code?: string, log?: boolean}
  constructor(container, { tools, panels = {}, speed = 1 }) {
    this.tools = tools;
    this.opts = { tools, memory: panels.memory ?? [] };
    this.speed = speed;
    this.root = el('div', 'tm');
    this.stage = el('div', 'tm-stage');
    this.side = el('div', 'tm-side');
    this.root.append(this.stage, this.side);
    container.append(this.root);

    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('class', 'tm-lines');
    this.stage.append(this.svg);
    this.agent = el('div', 'tm-node tm-agent', '<span class="tm-ic">🤖</span><span>Agent</span>');
    this.stage.append(this.agent);
    this.nodes = {};
    this.lines = {};
    // several real tool names can share one node, e.g. save_memory + recall_memory -> Memory
    this.alias = {};
    for (const t of tools) for (const a of t.aliases ?? []) this.alias[a] = t.id;
    const preset = LAYOUTS[tools.length];
    tools.forEach((t, i) => {
      t.pos = t.pos ?? preset?.[i] ?? ellipse(i, tools.length);
      const node = el('div', `tm-node${t.danger ? ' tm-danger' : ''}`, `<span class="tm-ic">${t.icon}</span><span>${esc(t.label)}</span>`);
      node.style.left = `${t.pos[0]}%`;
      node.style.top = `${t.pos[1]}%`;
      this.stage.append(node);
      this.nodes[t.id] = node;
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', '50%'); line.setAttribute('y1', '46%');
      line.setAttribute('x2', `${t.pos[0]}%`); line.setAttribute('y2', `${t.pos[1]}%`);
      this.svg.append(line);
      this.lines[t.id] = line;
    });
    this.agent.style.left = '50%';
    this.agent.style.top = '46%';
    this.dot = el('div', 'tm-dot');
    this.bubble = el('div', 'tm-bubble');
    this.caption = el('div', 'tm-caption');
    this.banner = el('div', 'tm-banner');
    this.overlay = el('div', 'tm-overlay');
    this.stage.append(this.dot, this.bubble, this.caption, this.banner, this.overlay);

    this.panels = {};
    if (panels.db) this.panels.db = new DbPanel(this.side, panels.db);
    if (panels.memory) this.panels.memory = new MemoryPanel(this.side);
    if (panels.code) this.panels.code = new CodePanel(this.side, panels.code);
    this.panels.log = new LogPanel(this.root);
    this.setLogVisible(Boolean(panels.log));
    if (!this.side.children.length) this.root.classList.add('tm-no-side');
    this.reset();
  }

  reset() {
    this.state = initialState(this.opts);
    this.overlay.innerHTML = '';
    this.overlay.className = 'tm-overlay';
    this.banner.className = 'tm-banner';
    this.dot.style.opacity = 0;
    this.moveDot(this.agent);
    this.render();
  }

  setLogVisible(on) {
    this.root.classList.toggle('tm-log-on', on);
  }

  toggleLog() {
    this.setLogVisible(!this.root.classList.contains('tm-log-on'));
  }

  moveDot(node) {
    this.dot.style.left = node.style.left;
    this.dot.style.top = node.style.top;
  }

  wait(ms) {
    return sleep(ms / this.speed);
  }

  nodeId(tool) {
    return this.alias[tool] ?? tool;
  }

  async travel(toolId, back = false) {
    const node = this.nodes[this.nodeId(toolId)];
    if (!node) return;
    this.dot.style.opacity = 1;
    this.moveDot(back ? node : this.agent);
    await this.wait(30);
    this.moveDot(back ? this.agent : node);
    await this.wait(800);
    if (back) this.dot.style.opacity = 0;
  }

  showOverlay(kind, html) {
    this.overlay.className = `tm-overlay tm-overlay-${kind} tm-show`;
    this.overlay.innerHTML = html;
  }

  async handle(e) {
    const prev = this.state;
    this.state = reduceState(this.state, e);
    // overlays (hidden text, guard, approval, published file) stay up until the agent's next action
    if (['user', 'tool.call', 'section'].includes(e.type)) this.overlay.classList.remove('tm-show');
    this.render(e);
    switch (e.type) {
      case 'tool.call':
        await this.travel(e.tool);
        break;
      case 'tool.result':
        await this.travel(e.tool, true);
        break;
      case 'memory.save':
      case 'memory.recall': {
        const id = this.nodeId(e.type === 'memory.save' ? 'save_memory' : 'recall_memory');
        if (this.nodes[id] && !prev.activeTool) { await this.travel(id); await this.travel(id, true); }
        else await this.wait(500);
        break;
      }
      case 'file.write':
        if (e.public) {
          const leaked = /sk_|PASSWORD|API_KEY/i.test(e.content);
          if (this.nodes.public) { await this.travel('public'); this.dot.style.opacity = 0; if (leaked) this.nodes.public.classList.add('tm-hit'); }
          this.showOverlay(leaked ? 'warn' : 'public', `<b>📢 Now public: ${esc(e.path)}</b><pre>${esc(e.content)}</pre>`);
        }
        await this.wait(400);
        break;
      case 'warn':
        this.showOverlay('warn', `<b>⚠️ Hidden in the page:</b><div>${esc(e.text)}</div>`);
        await this.wait(600);
        break;
      case 'guard':
        this.showOverlay('guard', `<b>🛡️ Guard</b><div>${esc(e.text)}</div>`);
        await this.wait(600);
        break;
      case 'approval':
        this.showOverlay('approval', `<b>🙋 Human check: publish this?</b><pre>${esc(e.text)}</pre><div class="tm-answer tm-${e.answer}">${e.answer === 'y' ? '✔ Approved' : '✖ Blocked'}</div>`);
        await this.wait(800);
        break;
      case 'section':
        this.banner.textContent = e.title;
        this.banner.className = 'tm-banner tm-show';
        await this.wait(900);
        break;
      default:
        await this.wait(350);
    }
  }

  render(e) {
    const s = this.state;
    const active = s.activeTool && this.nodeId(s.activeTool);
    for (const [id, node] of Object.entries(this.nodes)) node.classList.toggle('tm-on', active === id);
    for (const [id, line] of Object.entries(this.lines)) line.classList.toggle('tm-on', active === id);
    if (e?.type === 'user' || !e) Object.values(this.nodes).forEach((n) => n.classList.remove('tm-hit'));
    this.agent.classList.toggle('tm-thinking', Boolean(s.bubble));
    this.bubble.textContent = s.bubble ? `💭 ${stripMarkdown(s.bubble)}` : '';
    this.bubble.classList.toggle('tm-show', Boolean(s.bubble));
    this.caption.textContent = s.caption || 'Ready.';
    this.panels.db?.highlight(s.highlightedRows);
    this.panels.memory?.render(s.memory);
    this.panels.code?.highlight(s.codeLine);
    this.panels.log.render(s.log);
  }
}
