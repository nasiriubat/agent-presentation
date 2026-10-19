// Final-review fix pass: hangs, stuck mic, fallback ordering, error display.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import { withTimeout } from '../src/core/timeout.js';
import { createApi } from '../src/core/api.js';
import { createOpenAI } from '../server/openai.js';
import { getEveningForecast } from '../server/weather.js';
import { sendInvite } from '../server/telegram.js';
import { RealtimeSession } from '../src/voice/session.js';
import { createNegotiator } from '../src/voice/negotiate.js';
import { exitGate } from '../src/voice/exitGate.js';
import { createRouter } from '../server/routes.js';

// A fetch that never answers. It holds a referenced timer like a real open socket would,
// because AbortSignal.timeout's own timer doesn't keep Node's event loop alive.
const hangingFetch = (url, init = {}) => new Promise((_, reject) => {
  const keepAlive = setTimeout(() => {}, 10000);
  init.signal?.addEventListener('abort', () => { clearTimeout(keepAlive); reject(Object.assign(new Error('aborted'), { name: 'AbortError' })); });
});

test('C1: withTimeout rejects a promise that never settles', async () => {
  const t = Date.now();
  await assert.rejects(withTimeout(new Promise(() => {}), 50, 'too slow'), /too slow/);
  assert.ok(Date.now() - t < 300);
});

test('C1: api.json gives up on a server that never answers', async () => {
  const s = await new Promise((r) => { const srv = http.createServer(() => {}).listen(0, () => r(srv)); });
  const api = createApi(`http://localhost:${s.address().port}`);
  const t = Date.now();
  await assert.rejects(api.json('/x', undefined, { timeoutMs: 80 }));
  assert.ok(Date.now() - t < 500);
  s.closeAllConnections(); s.close();
});

test('C1: server OpenAI calls time out instead of hanging', async () => {
  const openai = createOpenAI({ apiKey: 'k', fetch: hangingFetch, timeoutMs: 60 });
  const t = Date.now();
  await assert.rejects(openai.responses({}));
  assert.ok(Date.now() - t < 500);
});

test('I2: a hanging weather service falls back to the cached forecast quickly', async () => {
  const t = Date.now();
  const f = await getEveningForecast({ fetch: hangingFetch, timeoutMs: 60 });
  assert.equal(f.cached, true);
  assert.ok(Date.now() - t < 500);
});

test('I2: a hanging Telegram call reports not delivered quickly', async () => {
  const t = Date.now();
  const r = await sendInvite({ fetch: hangingFetch, token: 'T', chatId: '1', text: 'x', timeoutMs: 60 });
  assert.equal(r.delivered, false);
  assert.ok(Date.now() - t < 500);
});

test('I8: two audio starts and one stop leave the mic live', async () => {
  const s = new RealtimeSession({ api: {}, tools: [], handlers: {} });
  await s.handle({ type: 'output_audio_buffer.started' });
  await s.handle({ type: 'output_audio_buffer.started' });
  await s.handle({ type: 'output_audio_buffer.stopped' });
  assert.equal(s.holds, 0);
});

test('I8: unmuting clears a stuck hold', async () => {
  const s = new RealtimeSession({ api: {}, tools: [], handlers: {} });
  await s.handle({ type: 'output_audio_buffer.started' });
  s.mute(true); s.mute(false);
  assert.equal(s.holds, 0);
  assert.equal(s.speaking, false);
});

test('I8: a realtime error event is surfaced, not just logged', async () => {
  const errors = [];
  const s = new RealtimeSession({ api: {}, tools: [], handlers: {}, onError: (m) => errors.push(m) });
  await s.handle({ type: 'error', error: { message: 'session expired' } });
  assert.deepEqual(errors, ['session expired']);
});

test('C2: connect fails with a clear error when the token never arrives', async () => {
  const s = new RealtimeSession({ api: { json: () => new Promise(() => {}) }, tools: [], handlers: {}, connectTimeoutMs: 60 });
  const t = Date.now();
  await assert.rejects(s.connect(), /took too long/);
  assert.ok(Date.now() - t < 500);
});

const FALLBACK = { booking: { restaurant: 'Ravintola Näsi', time: '20:30', seating: 'indoors', partySize: 8, vegetarian: true },
  turns: [1, 2, 3, 4, 5, 6].map((n) => ({ speaker: n % 2 ? 'yours' : 'restaurant', text: `t${n}` })) };

test('I5: if the call stream dies before any turn, the scripted call plays client-side', async () => {
  const played = [], lines = [];
  const negotiate = createNegotiator({
    api: { sse: (p, b, on) => { setTimeout(() => on({ type: 'error', message: 'down' })); return { abort() {} }; } },
    board: { negotiationStart() {}, negotiationEnd() {}, negotiationTurn: (s, t) => lines.push(t) },
    playBase64: async () => {}, playUrl: async (u) => played.push(u),
    loadFallback: async () => FALLBACK,
  });
  const r = await negotiate({ restaurant: 'Ravintola Näsi', partySize: 8 });
  assert.deepEqual(lines, ['t1', 't2', 't3', 't4', 't5', 't6']);
  assert.equal(played.length, 6);
  assert.equal(r.booking.time, '20:30');
});

test('I1: a second → within the window leaves a finale that never finished', () => {
  const gate = exitGate(1500);
  assert.equal(gate(1000), false);
  assert.equal(gate(4000), false);
  assert.equal(gate(4800), true);
});

test('I7: a model failure in Demo 1 ends with an apology answer, not a hidden-text warning', async () => {
  const app = express(); app.use(express.json());
  app.use(createRouter({ env: {}, openai: { responses: async () => { throw new Error('OpenAI /responses 429: {...}'); } } }));
  const srv = await new Promise((r) => { const s = app.listen(0, () => r(s)); });
  try {
    const text = await (await fetch(`http://localhost:${srv.address().port}/api/agent/run`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"question":"q"}' })).text();
    const events = text.split('\n').filter((l) => l.startsWith('data: ')).map((l) => JSON.parse(l.slice(6)));
    assert.ok(!events.some((e) => e.type === 'warn'));
    const last = events.at(-1);
    assert.equal(last.type, 'answer');
    assert.equal(last.error, true);
    assert.doesNotMatch(last.text, /429/);
  } finally { srv.close(); }
});
