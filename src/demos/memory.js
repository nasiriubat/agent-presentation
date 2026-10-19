// "When memory goes wrong": a stale fact in shared memory, then the same agent with provenance + verification.
import { toolmapDemo, loadJson } from './toolmapDemo.js';

const TOOLS = [
  { id: 'memory', label: 'Shared memory', icon: '🗂️', aliases: ['read_memory', 'write_memory'], phrase: 'opens the shared memory' },
  { id: 'search_notes', label: 'Project notes', icon: '📒', phrase: 'checks the project notes' },
  { id: 'newsletter', label: 'Newsletter', icon: '📰' },
];

export async function mount(container, { api } = {}) {
  const [unguarded, guarded] = await Promise.all([loadJson('data/memory-unguarded.json'), loadJson('data/memory-guarded.json')]);
  return toolmapDemo(container, {
    api,
    tools: TOOLS,
    panels: {},
    tabs: [
      { id: 'trust', label: '😬 Trusts memory', replay: 'replays/memory-unguarded.json', memory: unguarded },
      { id: 'verify', label: '🛡️ Checks memory', replay: 'replays/memory-guarded.json', memory: guarded },
    ],
  });
}
