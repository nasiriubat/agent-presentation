import { test } from 'node:test';
import assert from 'node:assert/strict';
import { liveAvailable } from '../src/core/modes.js';

const store = (v) => ({ getItem: (k) => (k === 'forceReplay' ? v : null) });
const liveServer = { health: async () => ({ live: true }) };

test('live is available when the server is up and replay is not forced', async () => {
  globalThis.localStorage = store(null);
  assert.equal(await liveAvailable(liveServer), true);
});

test('forced replay wins even when the server is up', async () => {
  globalThis.localStorage = store('1');
  assert.equal(await liveAvailable(liveServer), false);
});

test('no server means replay', async () => {
  globalThis.localStorage = store(null);
  assert.equal(await liveAvailable({ health: async () => ({ live: false }) }), false);
});
