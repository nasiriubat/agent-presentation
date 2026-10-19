import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { validateEvent } from '../src/core/events.js';

const DIR = 'public/replays/';
const EVENT_REPLAYS = ['coldopen.json', 'demo1-task1.json', 'memory-unguarded.json', 'memory-guarded.json', 'demo2-unguarded.json', 'demo2-guarded.json'];
const load = (f) => JSON.parse(readFileSync(DIR + f, 'utf8'));

test('every demo replay exists', () => {
  for (const f of EVENT_REPLAYS) assert.ok(existsSync(DIR + f), f);
});

for (const f of EVENT_REPLAYS) {
  test(`${f}: every event is valid and the first one is a step`, () => {
    const events = load(f);
    assert.ok(events.length > 1);
    assert.equal(events[0].step, true);
    for (const e of events) validateEvent(e);
  });
}

test('every other replay JSON in the folder is accounted for', () => {
  const extra = readdirSync(DIR).filter((f) => f.endsWith('.json') && !EVENT_REPLAYS.includes(f));
  assert.deepEqual(extra, ['negotiation-fallback.json']);
});

test('the unguarded injection replay leaks the fake key to a public file', () => {
  const leak = load('demo2-unguarded.json').find((e) => e.type === 'file.write' && e.public);
  assert.ok(leak);
  assert.match(leak.content, /sk_demo_FAKE/);
});

test('the guarded injection replay never publishes the key and asks a human', () => {
  const events = load('demo2-guarded.json');
  assert.ok(events.some((e) => e.type === 'approval'));
  for (const e of events.filter((x) => x.type === 'file.write')) assert.doesNotMatch(e.content, /sk_demo_FAKE/);
});

test('the guarded memory replay corrects the stale launch date', () => {
  const events = load('memory-guarded.json');
  assert.ok(events.some((e) => e.type === 'memory.save' && /2026-11-03/.test(e.fact)));
  assert.match(events.at(-1).text, /3 November/);
});

test('the finale replay is a list of timed board calls', () => {
  const calls = load('finale/events.json');
  assert.ok(calls.every((c) => typeof c.t === 'number' && typeof c.m === 'string' && Array.isArray(c.a)));
  assert.ok(calls.some((c) => c.m === 'booking'));
});
