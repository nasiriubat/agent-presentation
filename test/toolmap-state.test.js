import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reduceState, initialState } from '../src/toolmap/state.js';

const tools = [{ id: 'search_notes', label: 'Search notes' }, { id: 'calculator', label: 'Calculator' }];
const s0 = () => initialState({ tools, memory: [{ fact: 'old fact' }] });

test('a tool result highlights the db rows it read', () => {
  const s = reduceState(s0(), { type: 'tool.result', id: 'c', tool: 'search_notes', result: 'x', rows: [1, 3] });
  assert.deepEqual(s.highlightedRows, [1, 3]);
});

test('a tool call lights the tool and narrates it in plain English', () => {
  const s = reduceState(s0(), { type: 'tool.call', id: 'c', tool: 'calculator', args: {} });
  assert.equal(s.activeTool, 'calculator');
  assert.equal(s.caption, 'It uses the Calculator…');
  assert.equal(s.codeLine, 4);
});

test('saving memory appends a glowing entry', () => {
  const s = reduceState(s0(), { type: 'memory.save', fact: 'Atlas = €14,000/person' });
  assert.deepEqual(s.memory.at(-1), { fact: 'Atlas = €14,000/person', glow: true, isNew: true });
  assert.equal(s.codeLine, 6);
});

test('recalling memory glows only the matching entry', () => {
  let s = reduceState(s0(), { type: 'memory.save', fact: 'Atlas = €14,000/person' });
  s = reduceState(s, { type: 'think', text: 'next day' });
  s = reduceState(s, { type: 'memory.recall', fact: 'Atlas = €14,000/person' });
  assert.deepEqual(s.memory.map((m) => m.glow), [false, true]);
});

test('thinking shows a bubble on code line 2', () => {
  const s = reduceState(s0(), { type: 'think', text: 'I need the headcount.' });
  assert.equal(s.bubble, 'I need the headcount.');
  assert.equal(s.codeLine, 2);
});

test('the answer clears the active tool and strips markdown', () => {
  let s = reduceState(s0(), { type: 'tool.call', id: 'c', tool: 'calculator', args: {} });
  s = reduceState(s, { type: 'answer', text: 'Atlas gets **EUR 14,000** per person, see `a.txt`.' });
  assert.equal(s.activeTool, null);
  assert.equal(s.codeLine, 8);
  assert.equal(s.caption, '✅ Atlas gets EUR 14,000 per person, see a.txt.');
});

test('every event adds a log line', () => {
  let s = reduceState(s0(), { type: 'user', text: 'q' });
  s = reduceState(s, { type: 'tool.call', id: 'c', tool: 'calculator', args: { expression: '1+1' } });
  assert.deepEqual(s.log, [{ kind: 'USER', text: 'q' }, { kind: 'TOOL', text: 'calculator({"expression":"1+1"})' }]);
});
