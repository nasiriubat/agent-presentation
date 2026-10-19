// Demo 1 tools: a fictional company's notes and team table, a calculator, a virtual file and memory.

const STOP = new Set(['the', 'and', 'for', 'what', 'how', 'many', 'much', 'per', 'our', 'with', 'does', 'have', 'all', 'team', 'teams']);

function words(text) {
  return [...new Set((text.toLowerCase().match(/[a-zà-ÿ0-9]+/g) ?? []).filter((w) => w.length > 2 && !STOP.has(w)))];
}

const eur = (n) => `EUR ${n.toLocaleString('en-US')}`;

export function createDemo1Tools({ notes, db, memory }) {
  return [
    {
      name: 'search_notes',
      description: 'Keyword search over the company notes and the team table. Returns matching lines.',
      parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'], additionalProperties: false },
      async handler({ query }) {
        const q = words(query);
        const lines = [];
        for (const note of notes) {
          for (const line of note.text.split('\n')) {
            const lw = line.toLowerCase();
            const score = q.filter((w) => lw.includes(w)).length;
            if (score && line.trim()) lines.push({ score, text: `[${note.id}] ${line.replace(/^-\s*/, '').trim()}` });
          }
        }
        lines.sort((a, b) => b.score - a.score);
        const rows = db.filter((r) => q.some((w) => r.team.toLowerCase() === w || r.lead.toLowerCase().includes(w)));
        if (!lines.length && !rows.length) return { result: `No notes match "${query}".`, rows: [] };
        const parts = [];
        if (lines.length) parts.push('From the notes:\n' + lines.slice(0, 6).map((l) => `- ${l.text}`).join('\n'));
        if (rows.length) parts.push('From the team table:\n' + rows.map((r) => `- ${r.team}: budget ${eur(r.budget_eur)}, ${r.people} people, lead ${r.lead}`).join('\n'));
        return { result: parts.join('\n\n'), rows: rows.map((r) => r.id) };
      },
    },
    {
      name: 'calculator',
      description: 'Evaluate an arithmetic expression, e.g. "84000/6". Only numbers and + - * / ( ).',
      parameters: { type: 'object', properties: { expression: { type: 'string' } }, required: ['expression'], additionalProperties: false },
      async handler({ expression }) {
        if (!/^[\d+\-*/().\s]+$/.test(expression)) return { result: 'Error: only arithmetic is allowed' };
        try {
          const value = Function(`"use strict"; return (${expression});`)();
          if (!Number.isFinite(value)) return { result: 'Error: the result is not a finite number' };
          return { result: String(Math.round(value * 100) / 100) };
        } catch {
          return { result: 'Error: could not parse the expression' };
        }
      },
    },
    {
      name: 'write_file',
      description: 'Save a text file (e.g. a summary) for the user.',
      parameters: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'], additionalProperties: false },
      async handler({ path, content }) {
        return { result: `Saved ${path} (${content.length} characters).`, event: { type: 'file.write', path, content, public: false } };
      },
    },
    {
      name: 'save_memory',
      description: 'Save one short fact to long-term memory so it can be reused in later conversations.',
      parameters: { type: 'object', properties: { fact: { type: 'string' } }, required: ['fact'], additionalProperties: false },
      async handler({ fact }) {
        memory.push(fact);
        return { result: `Saved to memory: ${fact}`, event: { type: 'memory.save', fact } };
      },
    },
    {
      name: 'recall_memory',
      description: 'Read everything in long-term memory. Check this first: the answer may already be known.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
      async handler() {
        if (!memory.length) return { result: 'Memory is empty.', events: [] };
        return { result: memory.map((f) => `- ${f}`).join('\n'), events: memory.map((fact) => ({ type: 'memory.recall', fact })) };
      },
    },
  ];
}
