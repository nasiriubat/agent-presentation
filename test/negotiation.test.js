import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runNegotiation } from '../server/negotiation.js';

const request = { restaurant: 'Ravintola Näsi', partySize: 8, vegetarian: 1, budgetPerPerson: 40, preferredTime: '19:00', rainChancePct: 70 };

function fallbackDir() {
  const dir = mkdtempSync(join(tmpdir(), 'neg-'));
  copyFileSync('public/replays/negotiation-fallback.json', join(dir, 'negotiation-fallback.json'));
  mkdirSync(join(dir, 'negotiation-fallback'));
  for (let i = 1; i <= 6; i++) writeFileSync(join(dir, 'negotiation-fallback', `turn-${i}.mp3`), `fallback-${i}`);
  return dir;
}

// restaurantSays(n) -> structured reply for the restaurant's n-th turn (1-based)
function fakeOpenAI({ restaurantSays, throwOn = -1 }) {
  let calls = 0, restaurantTurns = 0;
  return {
    responses: async (body) => {
      if (calls++ === throwOn) throw new Error('boom');
      const isRestaurant = body.instructions.includes('host at Ravintola');
      const reply = isRestaurant ? restaurantSays(++restaurantTurns) : { say: 'We would like 19:00 please.', accept: false };
      return { output_text: JSON.stringify(reply) };
    },
    tts: async () => Buffer.from('mp3'),
  };
}

const run = async (opts) => {
  const events = [];
  const result = await runNegotiation({ request, fallbackDir: fallbackDir(), emit: (e) => events.push(e), ...opts });
  return { events, turns: events.filter((e) => e.type === 'negotiation.turn'), done: events.at(-1), result };
};

test('a live agreement ends the call with the agreed booking', async () => {
  const openai = fakeOpenAI({ restaurantSays: (n) => (n === 2 ? { say: 'Booked!', status: 'agreed', time: '20:30', seating: 'indoors' } : { say: 'Only the terrace at seven.', status: 'open' }) });
  const { turns, done } = await run({ openai });
  assert.equal(turns.length, 4);
  assert.deepEqual(turns.map((t) => t.speaker), ['yours', 'restaurant', 'yours', 'restaurant']);
  assert.equal(turns[0].audioBase64, Buffer.from('mp3').toString('base64'));
  assert.equal(done.type, 'negotiation.done');
  assert.equal(done.fallback, false);
  assert.deepEqual(done.booking, { restaurant: 'Ravintola Näsi', time: '20:30', seating: 'indoors', partySize: 8, vegetarian: true });
});

test('no agreement after 8 live turns hands over to fallback turns 3–6', async () => {
  const openai = fakeOpenAI({ restaurantSays: () => ({ say: 'Hmm.', status: 'open' }) });
  const { turns, done } = await run({ openai });
  assert.equal(turns.length, 12);
  assert.equal(turns[8].text, (await import('../public/replays/negotiation-fallback.json', { with: { type: 'json' } })).default.turns[2].text);
  assert.equal(turns[8].audioBase64, Buffer.from('fallback-3').toString('base64'));
  assert.equal(done.fallback, true);
  assert.equal(done.booking.time, '20:30');
});

test('an error on the first call plays the whole fallback', async () => {
  const openai = fakeOpenAI({ restaurantSays: () => ({ say: 'x', status: 'open' }), throwOn: 0 });
  const { turns, done } = await run({ openai });
  assert.equal(turns.length, 6);
  assert.equal(turns[0].audioBase64, Buffer.from('fallback-1').toString('base64'));
  assert.equal(done.fallback, true);
});

test('running past the time budget switches to fallback turns 3–6', async () => {
  let t = 0, turnsSoFar = 0;
  const openai = fakeOpenAI({ restaurantSays: () => ({ say: 'Hmm.', status: 'open' }) });
  const now = () => t;
  const events = [];
  await runNegotiation({ openai, request, now, fallbackDir: fallbackDir(), emit: (e) => { events.push(e); if (e.type === 'negotiation.turn' && ++turnsSoFar === 2) t += 41000; } });
  const turns = events.filter((e) => e.type === 'negotiation.turn');
  assert.equal(turns.length, 6);
  assert.equal(turns[2].audioBase64, Buffer.from('fallback-3').toString('base64'));
  assert.equal(events.at(-1).fallback, true);
});

test('a call that hangs past the budget hands over to the fallback in time', async () => {
  const openai = {
    responses: () => new Promise(() => {}),
    tts: async () => Buffer.from('mp3'),
  };
  const start = Date.now();
  const events = [];
  await runNegotiation({ openai, request, budgetMs: 80, fallbackDir: fallbackDir(), emit: (e) => events.push(e) });
  assert.ok(Date.now() - start < 500);
  assert.equal(events.filter((e) => e.type === 'negotiation.turn').length, 6);
  assert.equal(events.at(-1).fallback, true);
});

test('both agents are told to speak English', async () => {
  const seen = [];
  const openai = {
    responses: async (body) => { seen.push(body.instructions); return { output_text: JSON.stringify({ say: 'ok', accept: false, status: 'agreed', time: '20:30', seating: 'indoors' }) }; },
    tts: async () => Buffer.from('mp3'),
  };
  await runNegotiation({ openai, request, fallbackDir: fallbackDir(), emit: () => {} });
  assert.equal(seen.length, 2);
  for (const s of seen) assert.match(s, /Always speak English/);
});
