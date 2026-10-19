import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runAgent } from '../server/agent.js';
import { createDemo1Tools } from '../server/tools/demo1.js';

const call = (name, args, id = 'c1') => ({ type: 'function_call', call_id: id, name, arguments: JSON.stringify(args) });
const say = (text) => ({ type: 'message', role: 'assistant', content: [{ type: 'output_text', text }] });

function fakeOpenAI(outputs) {
  const requests = [];
  let i = 0;
  return {
    requests,
    responses: async (body) => {
      requests.push(structuredClone(body));
      const out = typeof outputs === 'function' ? outputs(i) : outputs[i];
      i++;
      return { output: out };
    },
  };
}

const echoTool = { name: 'echo', description: 'echo', parameters: { type: 'object', properties: {} }, handler: async () => ({ result: 'ECHOED' }) };

test('a tool call then an answer produces think, tool.call, tool.result, answer', async () => {
  const openai = fakeOpenAI([[say('I will echo.'), call('echo', {})], [say('Done.')]]);
  const events = [];
  await runAgent({ openai, system: 's', tools: [echoTool], question: 'q', emit: (e) => events.push(e) });
  assert.deepEqual(events.map((e) => e.type), ['user', 'think', 'tool.call', 'tool.result', 'answer']);
  const out = openai.requests[1].input.find((x) => x.type === 'function_call_output');
  assert.equal(out.call_id, 'c1');
  assert.equal(out.output, 'ECHOED');
});

test('a model that never stops is cut off at maxSteps', async () => {
  const openai = fakeOpenAI((i) => [call('echo', {}, `c${i}`)]);
  const events = [];
  await runAgent({ openai, system: 's', tools: [echoTool], question: 'q', maxSteps: 3, emit: (e) => events.push(e) });
  assert.equal(events.filter((e) => e.type === 'tool.call').length, 3);
  assert.equal(events.at(-1).type, 'answer');
  assert.match(events.at(-1).text, /step limit/);
});

test('an unanswerable audience question ends with an honest answer', async () => {
  const notes = JSON.parse(readFileSync('public/data/notes.json', 'utf8'));
  const db = JSON.parse(readFileSync('public/data/db.json', 'utf8'));
  const openai = fakeOpenAI([[call('search_notes', { query: 'CEO salary' })], [say("That's not in the notes.")]]);
  const events = [];
  await runAgent({ openai, system: 's', tools: createDemo1Tools({ notes, db, memory: [] }), question: "what's the CEO's salary?", emit: (e) => events.push(e) });
  assert.match(events.find((e) => e.type === 'tool.result').result, /No notes match/);
  assert.match(events.at(-1).text, /not in the notes/);
});

test('handler side events are emitted after the tool result', async () => {
  const memTool = { ...echoTool, name: 'mem', handler: async () => ({ result: 'ok', event: { type: 'memory.save', fact: 'f' } }) };
  const openai = fakeOpenAI([[call('mem', {})], [say('ok')]]);
  const events = [];
  await runAgent({ openai, system: 's', tools: [memTool], question: 'q', emit: (e) => events.push(e) });
  assert.deepEqual(events.map((e) => e.type), ['user', 'tool.call', 'tool.result', 'memory.save', 'answer']);
});

test('unknown tool names are reported back to the model, not thrown', async () => {
  const openai = fakeOpenAI([[call('nope', {})], [say('sorry')]]);
  const events = [];
  await runAgent({ openai, system: 's', tools: [echoTool], question: 'q', emit: (e) => events.push(e) });
  assert.match(events.find((e) => e.type === 'tool.result').result, /Error: unknown tool/);
});
