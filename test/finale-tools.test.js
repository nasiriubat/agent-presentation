import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { filterRestaurants, createHandlers, FINALE_TOOLS } from '../src/voice/tools.js';

const restaurants = JSON.parse(readFileSync('public/data/restaurants.json', 'utf8'));
const memory = JSON.parse(readFileSync('public/data/finale-memory.json', 'utf8'));
const board = new Proxy({}, { get: () => () => {} }); // ignores every UI call

test('filterRestaurants keeps vegetarian places within budget that fit the party', () => {
  const r = filterRestaurants(restaurants, { vegetarian: true, maxPricePerPerson: 40, partySize: 8 });
  assert.deepEqual(r.map((x) => x.id), ['nasi']);
});

test('filterRestaurants without a party size keeps small places too', () => {
  const r = filterRestaurants(restaurants, { vegetarian: true, maxPricePerPerson: 40 });
  assert.deepEqual(r.map((x) => x.id).sort(), ['nasi', 'tammela']);
});

test('every tool has a handler', () => {
  const h = createHandlers({ api: {}, board, data: { restaurants, memory }, negotiate: async () => ({}) });
  for (const t of FINALE_TOOLS) assert.equal(typeof h[t.name], 'function', t.name);
});

test('call_restaurant runs the negotiation with the latest weather and returns the booking', async () => {
  let asked;
  const api = { json: async (path) => (path === '/api/weather' ? { tempC: 4, rainChancePct: 70, summary: 'Rain', cached: false } : {}) };
  const negotiate = async (request) => { asked = request; return { booking: { restaurant: 'Ravintola Näsi', time: '20:30', seating: 'indoors', partySize: 8, vegetarian: true }, fallback: false }; };
  const h = createHandlers({ api, board, data: { restaurants, memory }, negotiate });
  await h.get_weather({});
  const out = JSON.parse(await h.call_restaurant({ restaurantId: 'nasi', partySize: 8, preferredTime: '19:00', vegetarianCount: 1 }));
  assert.equal(asked.restaurant, 'Ravintola Näsi');
  assert.equal(asked.rainChancePct, 70);
  assert.equal(out.booking.time, '20:30');
});

test('get_weather falls back to a cached forecast when the server is down', async () => {
  const h = createHandlers({ api: { json: async () => { throw new Error('down'); } }, board, data: { restaurants, memory }, negotiate: async () => ({}) });
  const out = JSON.parse(await h.get_weather({}));
  assert.equal(out.cached, true);
});

test('send_invite reports a failed delivery without throwing', async () => {
  const h = createHandlers({ api: { json: async () => { throw new Error('down'); } }, board, data: { restaurants, memory }, negotiate: async () => ({}) });
  assert.deepEqual(JSON.parse(await h.send_invite({ who: 'nasir', text: 'Dinner 20:30' })), { delivered: false });
});

test('recall_memory returns the stored facts and save_memory adds one', async () => {
  const h = createHandlers({ api: {}, board, data: { restaurants, memory: [...memory] }, negotiate: async () => ({}) });
  await h.save_memory({ fact: 'Aino does not eat fish' });
  const out = JSON.parse(await h.recall_memory({}));
  assert.equal(out.facts.length, 4);
  assert.equal(out.facts.at(-1), 'Aino does not eat fish');
});
