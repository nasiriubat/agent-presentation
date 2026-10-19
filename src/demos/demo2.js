// Demo 2 · Watch it get fooled: a web page hides instructions; then the same task with guards.
import { toolmapDemo } from './toolmapDemo.js';

const TOOLS = [
  { id: 'read_webpage', label: 'Read web page', icon: '🌐', phrase: 'reads the web page' },
  { id: 'read_file', label: 'Your private files', icon: '🔐', phrase: 'opens your private files' },
  { id: 'public', label: 'Public wiki', icon: '📢', danger: true, aliases: ['publish'], phrase: 'publishes to the public wiki' },
];

export async function mount(container, { api } = {}) {
  return toolmapDemo(container, {
    api,
    tools: TOOLS,
    panels: {},
    tabs: [
      { id: 'unguarded', label: '😈 No guard', replay: 'replays/demo2-unguarded.json' },
      { id: 'guarded', label: '🛡️ With guard', replay: 'replays/demo2-guarded.json' },
    ],
    overlay: (t) => t.id === 'unguarded'
      ? `<div>Task: <i>"Summarise this review for our wiki."</i><br><b>Will the agent fall for the hidden trap?</b><div class="vote"><span>🙋 Yes</span><span>🙅 No</span></div><small>Hands up, then press → to find out</small></div>`
      : `<div><b>Same task, same page.</b><br>Now with two guards: the page is labelled "untrusted", and anything public needs a human's yes.<small>Press → to run it</small></div>`,
  });
}
