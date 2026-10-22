// "When memory goes wrong": a stale fact in shared memory, then the same agent with provenance + verification.
import { toolmapDemo, loadJson } from './toolmapDemo.js';
import { icon } from '../ui/icons.js';

const TOOLS = [
  { id: 'memory', label: 'Shared memory', icon: 'notebook', aliases: ['read_memory', 'write_memory'], phrase: 'opens the shared memory' },
  { id: 'search_notes', label: 'Project notes', icon: 'book', phrase: 'checks the project notes' },
  { id: 'newsletter', label: 'Newsletter', icon: 'newspaper' },
];

export async function mount(container, { api } = {}) {
  const [unguarded, guarded] = await Promise.all([loadJson('data/memory-unguarded.json'), loadJson('data/memory-guarded.json')]);
  return toolmapDemo(container, {
    api,
    tools: TOOLS,
    panels: {},
    tabs: [
      { id: 'trust', label: `${icon('notebook')} Trusts memory`, replay: 'replays/memory-unguarded.json', memory: unguarded },
      { id: 'verify', label: `${icon('shield')} Checks memory`, replay: 'replays/memory-guarded.json', memory: guarded },
    ],
  });
}
