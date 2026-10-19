import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createDemo1Tools } from '../server/tools/demo1.js';

const notes = JSON.parse(readFileSync('public/data/notes.json', 'utf8'));
const db = JSON.parse(readFileSync('public/data/db.json', 'utf8'));
const byName = (memory = []) => Object.fromEntries(createDemo1Tools({ notes, db, memory }).map((t) => [t.name, t]));

test('search_notes finds the Atlas budget and reports the db row it read', async () => {
  const r = await byName().search_notes.handler({ query: 'Atlas budget' });
  assert.match(r.result, /84,000/);
  assert.ok(r.rows.includes(1));
});

test('search_notes says so when nothing matches', async () => {
  const r = await byName().search_notes.handler({ query: 'zebra' });
  assert.match(r.result, /No notes match/);
  assert.deepEqual(r.rows, []);
});

test('calculator does arithmetic', async () => {
  assert.equal((await byName().calculator.handler({ expression: '84000/6' })).result, '14000');
});

test('calculator refuses anything that is not arithmetic', async () => {
  assert.match((await byName().calculator.handler({ expression: 'process.exit()' })).result, /^Error/);
});

test('write_file emits a private file.write event', async () => {
  const r = await byName().write_file.handler({ path: 'x.md', content: 'hi' });
  assert.deepEqual(r.event, { type: 'file.write', path: 'x.md', content: 'hi', public: false });
});

test('save_memory stores the fact and recall_memory returns it', async () => {
  const memory = [];
  const tools = byName(memory);
  const saved = await tools.save_memory.handler({ fact: 'Atlas = €14,000/person' });
  assert.deepEqual(saved.event, { type: 'memory.save', fact: 'Atlas = €14,000/person' });
  const recalled = await tools.recall_memory.handler({});
  assert.match(recalled.result, /Atlas = €14,000\/person/);
  assert.deepEqual(recalled.events, [{ type: 'memory.recall', fact: 'Atlas = €14,000/person' }]);
});
