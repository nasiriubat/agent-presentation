import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateEvent, EVENT_TYPES } from '../src/core/events.js';

test('accepts a well-formed user event', () => {
  assert.equal(validateEvent({ type: 'user', text: 'hi' }), true);
});

test('rejects an unknown event type', () => {
  assert.throws(() => validateEvent({ type: 'nope' }), /unknown event type/);
});

test('rejects a tool.call without id and args', () => {
  assert.throws(() => validateEvent({ type: 'tool.call', tool: 'x' }), /missing/);
});

test('lists every event type the demos use', () => {
  for (const t of ['user', 'think', 'tool.call', 'tool.result', 'memory.save', 'memory.recall',
    'file.write', 'answer', 'warn', 'guard', 'approval', 'section']) {
    assert.ok(EVENT_TYPES.includes(t), t);
  }
});
