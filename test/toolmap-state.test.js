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
  assert.equal(s.caption, 'Atlas gets EUR 14,000 per person, see a.txt.');
});

test('every event adds a log line', () => {
  let s = reduceState(s0(), { type: 'user', text: 'q' });
  s = reduceState(s, { type: 'tool.call', id: 'c', tool: 'calculator', args: { expression: '1+1' } });
  assert.deepEqual(s.log, [{ kind: 'USER', text: 'q' }, { kind: 'TOOL', text: 'calculator({"expression":"1+1"})' }]);
});

test('a tool can provide its own phrase for the caption', () => {
  const s = reduceState(initialState({ tools: [{ id: 'read_file', label: 'Your private files', phrase: 'opens your private files' }] }),
    { type: 'tool.call', id: 'c', tool: 'read_file', args: {} });
  assert.equal(s.caption, 'It opens your private files…');
});

// The story panel: a plain-English, chat-like account of what happened, derived from the same events.
test('the story starts empty and gains one entry per meaningful event', () => {
  let s = s0();
  assert.deepEqual(s.story, []);
  s = reduceState(s, { type: 'user', text: 'What is the budget?' });
  s = reduceState(s, { type: 'think', text: 'I need the headcount.' });
  s = reduceState(s, { type: 'tool.call', id: 'c', tool: 'calculator', args: {} });
  s = reduceState(s, { type: 'tool.result', id: 'c', tool: 'calculator', result: '14000' });
  s = reduceState(s, { type: 'answer', text: '**14,000** per person.' });
  assert.deepEqual(s.story.map((e) => e.role), ['user', 'think', 'tool', 'answer']);
  assert.deepEqual(s.story.map((e) => e.text), ['What is the budget?', 'I need the headcount.', 'It uses the Calculator…', '14,000 per person.']);
});

test('a tool result marks its story entry as done instead of adding a new one', () => {
  let s = reduceState(s0(), { type: 'tool.call', id: 'c', tool: 'search_notes', args: {} });
  assert.equal(s.story.at(-1).done, false);
  s = reduceState(s, { type: 'tool.result', id: 'c', tool: 'search_notes', result: 'x' });
  assert.equal(s.story.length, 1);
  assert.equal(s.story.at(-1).done, true);
  assert.equal(s.story.at(-1).tool, 'search_notes');
});

test('memory, warnings, guards, human checks, files and sections all narrate', () => {
  let s = reduceState(s0(), { type: 'memory.save', fact: 'f' });
  s = reduceState(s, { type: 'memory.recall', fact: 'f' });
  s = reduceState(s, { type: 'warn', text: 'hidden text' });
  s = reduceState(s, { type: 'guard', text: 'guard on' });
  s = reduceState(s, { type: 'approval', text: 'summary', answer: 'y' });
  s = reduceState(s, { type: 'file.write', path: 'public/x.md', content: 'c', public: true });
  s = reduceState(s, { type: 'section', title: 'The next day' });
  assert.deepEqual(s.story.map((e) => e.role), ['memory', 'memory', 'warn', 'guard', 'human', 'file', 'section']);
  assert.equal(s.story[4].text, 'A human checks it first: approved.');
  assert.match(s.story[5].text, /publishes public\/x\.md/);
});

test('a new user request starts a fresh story only within the same run', () => {
  let s = reduceState(s0(), { type: 'user', text: 'first' });
  s = reduceState(s, { type: 'answer', text: 'done' });
  s = reduceState(s, { type: 'section', title: 'next day' });
  s = reduceState(s, { type: 'user', text: 'second' });
  assert.equal(s.story.length, 4); // the story keeps the whole run, including the section break
});

test('a harm event narrates as a dangerous warning', () => {
  const s = reduceState(s0(), { type: 'harm', text: 'EUR 4,200 sent to an unknown account.' });
  assert.deepEqual(s.story.at(-1), { role: 'warn', text: 'EUR 4,200 sent to an unknown account.', danger: true });
  assert.equal(s.log.at(-1).kind, 'HARM');
});
