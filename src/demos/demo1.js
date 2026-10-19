// Demo 1 · Watch it work: tools, a visible database, memory and the loop itself.
import { toolmapDemo, loadJson, loadText } from './toolmapDemo.js';

export const DEMO1_TOOLS = [
  { id: 'search_notes', label: 'Search notes', icon: '🔎' },
  { id: 'calculator', label: 'Calculator', icon: '🧮' },
  { id: 'write_file', label: 'Write file', icon: '📄' },
  { id: 'memory', label: 'Memory', icon: '🗂️', aliases: ['save_memory', 'recall_memory'] },
];

export async function mount(container, { mode = 'replay', api } = {}) {
  const [db, code] = await Promise.all([loadJson('data/db.json'), loadText('data/pseudocode.txt')]);
  const memory = [];
  return toolmapDemo(container, {
    api, mode,
    tools: DEMO1_TOOLS,
    panels: { db, memory: [], code },
    tabs: [{ id: 'task', label: 'Prepared task', replay: 'replays/demo1-task1.json' }],
    live: {
      path: '/api/agent/run',
      body: (question) => ({ question, memory }),
    },
  });
}
