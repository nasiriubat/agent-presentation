// The whole agent: ask the model, run the tool it picked, hand back the result, repeat.

const textOf = (item) => (item.content ?? []).filter((c) => c.type === 'output_text').map((c) => c.text).join('').trim();

export async function runAgent({ openai, model = 'gpt-6-luna', system, tools, question, maxSteps = 8, emit }) {
  const byName = Object.fromEntries(tools.map((t) => [t.name, t]));
  const toolDefs = tools.map(({ name, description, parameters }) => ({ type: 'function', name, description, parameters, strict: false }));
  const input = [{ role: 'user', content: question }];
  emit({ type: 'user', text: question, step: true });

  for (let step = 0; step < maxSteps; step++) {
    const res = await openai.responses({ model, instructions: system, input, tools: toolDefs, reasoning: { effort: 'low' }, store: false });
    const output = res.output ?? [];
    input.push(...output.filter((o) => o.type !== 'reasoning'));
    const calls = output.filter((o) => o.type === 'function_call');
    const text = output.filter((o) => o.type === 'message').map(textOf).join(' ').trim();

    if (!calls.length) {
      emit({ type: 'answer', text: text || '(no answer)', step: true });
      return;
    }
    if (text) emit({ type: 'think', text, step: true });

    for (const c of calls) {
      let args = {};
      try { args = JSON.parse(c.arguments || '{}'); } catch {}
      emit({ type: 'tool.call', id: c.call_id, tool: c.name, args, step: !text });
      const tool = byName[c.name];
      const out = tool ? await tool.handler(args) : { result: `Error: unknown tool ${c.name}` };
      emit({ type: 'tool.result', id: c.call_id, tool: c.name, result: out.result, ...(out.rows ? { rows: out.rows } : {}) });
      for (const e of [out.event, ...(out.events ?? [])].filter(Boolean)) emit(e);
      input.push({ type: 'function_call_output', call_id: c.call_id, output: out.result });
    }
  }
  emit({ type: 'answer', text: "I couldn't finish within the step limit.", step: true });
}
