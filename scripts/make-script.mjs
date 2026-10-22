// Builds SCRIPT.md, the speaker script, from the slide notes in index.html, so the two never drift.
// Each <section data-title data-time> with an <aside class="notes"> becomes one entry.
import { readFileSync, writeFileSync } from 'node:fs';

const html = readFileSync('index.html', 'utf8');
const sections = [...html.matchAll(/<section\b([^>]*)>([\s\S]*?)<\/section>/g)];
const attr = (s, name) => s.match(new RegExp(`${name}="([^"]*)"`))?.[1] ?? '';
const unescape = (t) => t.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
const md = (t) => unescape(t
  .replace(/<b>(.*?)<\/b>/g, '**$1**').replace(/<i>(.*?)<\/i>/g, '*$1*').replace(/<br\s*\/?>/g, ' ')
  .replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());

const rows = sections.map((m, i) => {
  const [, attrs, body] = m;
  const notes = body.match(/<aside class="notes">([\s\S]*?)<\/aside>/)?.[1] ?? '';
  const paras = [...notes.matchAll(/<p>([\s\S]*?)<\/p>/g)].map((p) => md(p[1]));
  return { n: i + 1, title: unescape(attr(attrs, 'data-title')), time: attr(attrs, 'data-time'), demo: attr(attrs, 'data-demo'), paras };
});

let out = `# Speaker script · From Answering to Doing

Generated from the speaker notes in \`index.html\` by \`npm run script\`. Edit the notes in the slides, not this file.

**Roles.** The **Theory speaker** tells the story and explains the ideas. The **Demo speaker** drives the demos, plays the "user", and talks to the voice agent. Swap roles however you like; the script only ever names the role. Keyboard: → steps a demo or advances a slide, ← goes back, ▶ on a demo plays and pauses, ↺ restarts it.

**Timing.** 60 minutes in total. The minute marks below are targets; the cut order if you run long is in the README.

| # | Slide | Minutes | Who leads |
|---|---|---|---|
${rows.map((r) => `| ${r.n} | ${r.title} | ${r.time || ''} | ${r.paras[0]?.match(/^\*\*(.*?):\*\*/)?.[1] ?? ''} |`).join('\n')}

---

`;
for (const r of rows) {
  out += `## ${r.n} · ${r.title}${r.time ? `  <sub>⏱ ${r.time}</sub>` : ''}\n\n`;
  if (r.demo) out += `*Demo slide: → steps the demo, ▶ plays it, ↺ restarts. The slide only advances when the demo is done.*\n\n`;
  for (const p of r.paras) out += `${p}\n\n`;
}
writeFileSync('SCRIPT.md', out);
console.log(`SCRIPT.md: ${rows.length} slides`);
