import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventPlayer } from '../src/core/player.js';

const events = [
  { type: 'user', step: true, text: 'a' },
  { type: 'think', text: 'b' },
  { type: 'answer', step: true, text: 'c' },
];

test('step() emits up to the next step marker and reports when done', async () => {
  const seen = [];
  const p = new EventPlayer(events, (e) => seen.push(e.text));
  assert.equal(await p.step(), true);
  assert.deepEqual(seen, ['a', 'b']);
  assert.equal(await p.step(), false);
  assert.deepEqual(seen, ['a', 'b', 'c']);
  assert.equal(p.done, true);
});

test('autoplay() honours the t offsets', async () => {
  const seen = [];
  const timed = events.map((e, i) => ({ ...e, t: i * 30 }));
  const p = new EventPlayer(timed, (e) => seen.push(e.text));
  const start = Date.now();
  await p.autoplay();
  assert.deepEqual(seen, ['a', 'b', 'c']);
  assert.ok(Date.now() - start >= 55);
});

test('reset() starts again from the first event', async () => {
  const seen = [];
  const p = new EventPlayer(events, (e) => seen.push(e.text));
  await p.step(); p.reset(); await p.step();
  assert.deepEqual(seen, ['a', 'b', 'a', 'b']);
});

test('step() awaits an async onEvent before the next event', async () => {
  const order = [];
  const p = new EventPlayer(events, async (e) => { await new Promise(r => setTimeout(r, 5)); order.push(e.text); });
  await p.step();
  assert.deepEqual(order, ['a', 'b']);
});
