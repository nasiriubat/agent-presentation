// Pure mapping from agent events to what the tool map shows. No DOM here, so it is unit-tested.

// Which line of the on-screen pseudocode is "running" for each event.
export const CODE_LINE = { think: 2, 'tool.call': 4, 'tool.result': 5, 'memory.save': 6, answer: 8 };

export const stripMarkdown = (t) => t.replace(/\*\*(.+?)\*\*/g, '$1').replace(/`([^`]+)`/g, '$1').replace(/^#+\s*/gm, '');

export function initialState({ tools = [], memory = [] } = {}) {
  const labels = {};
  for (const t of tools) for (const id of [t.id, ...(t.aliases ?? [])]) labels[id] = t.label;
  return {
    labels,
    activeTool: null,
    highlightedRows: [],
    memory: memory.map((m) => ({ ...m, glow: false, isNew: false })),
    codeLine: null,
    caption: '',
    bubble: '',
    log: [],
  };
}

const LOG_KIND = {
  user: 'USER', think: 'THINK', 'tool.call': 'TOOL', 'tool.result': '→', 'memory.save': 'MEMORY+', 'memory.recall': 'MEMORY?',
  'file.write': 'FILE', answer: 'ANSWER', warn: 'WARNING', guard: 'GUARD', approval: 'HUMAN', section: '——',
};

function logText(e) {
  switch (e.type) {
    case 'tool.call': return `${e.tool}(${JSON.stringify(e.args)})`;
    case 'tool.result': return e.result;
    case 'memory.save': case 'memory.recall': return e.fact;
    case 'file.write': return `${e.public ? 'PUBLISH ' : ''}${e.path}`;
    case 'approval': return `${e.text} → ${e.answer}`;
    case 'section': return e.title;
    default: return e.text;
  }
}

export function reduceState(state, e) {
  const s = { ...state, log: [...state.log, { kind: LOG_KIND[e.type], text: logText(e) }] };
  if (CODE_LINE[e.type]) s.codeLine = CODE_LINE[e.type];
  const calm = (m) => ({ ...m, glow: false, isNew: false });

  switch (e.type) {
    case 'user':
      return { ...s, caption: `📋 "${e.text}"`, bubble: '', activeTool: null, highlightedRows: [], memory: s.memory.map(calm) };
    case 'think':
      return { ...s, bubble: e.text, memory: s.memory.map(calm) };
    case 'tool.call': {
      const label = s.labels[e.tool] ?? e.tool;
      return { ...s, activeTool: e.tool, bubble: '', caption: `It uses the ${label}…` };
    }
    case 'tool.result':
      return { ...s, highlightedRows: e.rows ?? s.highlightedRows, caption: `${s.caption.replace(/…$/, '')}… and reads the result.` };
    case 'memory.save':
      return { ...s, memory: [...s.memory.map(calm), { fact: e.fact, ...(e.source ? { source: e.source } : {}), glow: true, isNew: true }], caption: 'It saves a fact to memory for next time.' };
    case 'memory.recall':
      return { ...s, memory: s.memory.map((m) => (m.fact === e.fact ? { ...m, glow: true } : m)), caption: 'It checks its memory first.' };
    case 'file.write':
      return { ...s, caption: e.public ? `⚠️ It publishes ${e.path} for everyone to see.` : `It writes ${e.path}: real work, not just a reply.` };
    case 'warn':
    case 'guard':
      return { ...s, caption: e.text };
    case 'approval':
      return { ...s, caption: `🙋 A human checks it first: ${e.answer === 'y' ? 'approved' : 'blocked'}.` };
    case 'answer':
      return { ...s, activeTool: null, bubble: '', caption: `✅ ${stripMarkdown(e.text)}` };
    case 'section':
      return { ...s, activeTool: null, bubble: '', highlightedRows: [], caption: e.title };
    default:
      return s;
  }
}
