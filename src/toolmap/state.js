// Pure mapping from agent events to what the tool map shows. No DOM here, so it is unit-tested.

// Which line of the on-screen pseudocode is "running" for each event.
export const CODE_LINE = { think: 2, 'tool.call': 4, 'tool.result': 5, 'memory.save': 6, answer: 8 };

export const stripMarkdown = (t) => t.replace(/\*\*(.+?)\*\*/g, '$1').replace(/`([^`]+)`/g, '$1').replace(/^#+\s*/gm, '');

export function initialState({ tools = [], memory = [] } = {}) {
  // what the caption says when a tool is used: a tool's own phrase, or "uses the <label>"
  const labels = {};
  for (const t of tools) for (const id of [t.id, ...(t.aliases ?? [])]) labels[id] = t.phrase ?? `uses the ${t.label}`;
  return {
    labels,
    activeTool: null,
    highlightedRows: [],
    memory: memory.map((m) => ({ ...m, glow: false, isNew: false })),
    codeLine: null,
    caption: '',
    bubble: '',
    log: [],
    story: [], // the plain-English account shown beside the stage: [{role, text, tool?, done?}]
  };
}

const LOG_KIND = {
  user: 'USER', think: 'THINK', 'tool.call': 'TOOL', 'tool.result': '→', 'memory.save': 'MEMORY+', 'memory.recall': 'MEMORY?',
  'file.write': 'FILE', answer: 'ANSWER', warn: 'WARNING', guard: 'GUARD', approval: 'HUMAN', harm: 'HARM', section: '——',
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

// The story entry an event adds (or null). A tool result completes the previous tool entry instead.
function storyEntry(e, labels) {
  switch (e.type) {
    case 'user': return { role: 'user', text: e.text };
    case 'think': return { role: 'think', text: stripMarkdown(e.text) };
    case 'tool.call': return { role: 'tool', tool: e.tool, text: `It ${labels[e.tool] ?? `uses ${e.tool}`}…`, done: false };
    case 'memory.save': return { role: 'memory', text: `It saves a fact to memory: "${e.fact}"` };
    case 'memory.recall': return { role: 'memory', text: `It remembers: "${e.fact}"` };
    case 'file.write': return { role: 'file', text: e.public ? `It publishes ${e.path} for everyone to see.` : `It writes ${e.path}: real work, not just a reply.`, danger: Boolean(e.public) };
    case 'warn': return { role: 'warn', text: e.text };
    case 'harm': return { role: 'warn', text: e.text, danger: true };
    case 'guard': return { role: 'guard', text: e.text };
    case 'approval': return { role: 'human', text: `A human checks it first: ${e.answer === 'y' ? 'approved' : 'blocked'}.` };
    case 'answer': return { role: 'answer', text: stripMarkdown(e.text) };
    case 'section': return { role: 'section', text: e.title };
    default: return null;
  }
}

export function reduceState(state, e) {
  const s = { ...state, log: [...state.log, { kind: LOG_KIND[e.type], text: logText(e) }] };
  if (CODE_LINE[e.type]) s.codeLine = CODE_LINE[e.type];
  const calm = (m) => ({ ...m, glow: false, isNew: false });
  const entry = storyEntry(e, s.labels);
  if (entry) s.story = [...s.story, entry];
  else if (e.type === 'tool.result') {
    const i = s.story.findLastIndex((x) => x.role === 'tool' && x.tool === e.tool);
    if (i >= 0) s.story = s.story.map((x, j) => (j === i ? { ...x, done: true } : x));
  }

  switch (e.type) {
    case 'user':
      return { ...s, caption: `"${e.text}"`, bubble: '', activeTool: null, highlightedRows: [], memory: s.memory.map(calm) };
    case 'think':
      return { ...s, bubble: e.text, memory: s.memory.map(calm) };
    case 'tool.call': {
      const action = s.labels[e.tool] ?? `uses ${e.tool}`;
      return { ...s, activeTool: e.tool, bubble: '', caption: `It ${action}…` };
    }
    case 'tool.result':
      return { ...s, highlightedRows: e.rows ?? s.highlightedRows, caption: `${s.caption.replace(/…$/, '')}… and reads the result.` };
    case 'memory.save':
      return { ...s, memory: [...s.memory.map(calm), { fact: e.fact, ...(e.source ? { source: e.source } : {}), glow: true, isNew: true }], caption: 'It saves a fact to memory for next time.' };
    case 'memory.recall':
      return { ...s, memory: s.memory.map((m) => (m.fact === e.fact ? { ...m, glow: true } : m)), caption: 'It checks its memory first.' };
    case 'file.write':
      return { ...s, caption: e.public ? `It publishes ${e.path} for everyone to see.` : `It writes ${e.path}: real work, not just a reply.` };
    case 'warn':
    case 'guard':
    case 'harm':
      return { ...s, caption: e.text };
    case 'approval':
      return { ...s, caption: `A human checks it first: ${e.answer === 'y' ? 'approved' : 'blocked'}.` };
    case 'answer':
      return { ...s, activeTool: null, bubble: '', caption: stripMarkdown(e.text) };
    case 'section':
      return { ...s, activeTool: null, bubble: '', highlightedRows: [], caption: e.title };
    default:
      return s;
  }
}
