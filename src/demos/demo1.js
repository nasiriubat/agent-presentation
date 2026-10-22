// Demo 1 · Watch it work: tools, a visible database, memory and the loop itself.
import { toolmapDemo, loadJson, loadText } from './toolmapDemo.js';

export const DEMO1_TOOLS = [
  { id: 'search_notes', label: 'Search notes', icon: 'search', phrase: 'searches the company notes' },
  { id: 'calculator', label: 'Calculator', icon: 'calculator' },
  { id: 'write_file', label: 'Write file', icon: 'file', phrase: 'writes a file' },
  { id: 'memory', label: 'Memory', icon: 'notebook', aliases: ['save_memory', 'recall_memory'], phrase: 'opens its memory' },
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
