import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getEveningForecast, CACHED_FORECAST } from '../server/weather.js';

const hours = Array.from({ length: 24 }, (_, h) => `2026-10-23T${String(h).padStart(2, '0')}:00`);
const okFetch = async () => ({
  ok: true,
  json: async () => ({
    hourly: {
      time: hours,
      temperature_2m: hours.map((_, h) => (h >= 18 && h <= 21 ? 4 + (h - 18) * -1 : 10)),
      precipitation_probability: hours.map((_, h) => (h >= 18 && h <= 21 ? 80 : 0)),
    },
  }),
});

test('averages the 18:00–21:00 hours', async () => {
  const f = await getEveningForecast({ fetch: okFetch });
  assert.equal(f.tempC, 2.5);
  assert.equal(f.rainChancePct, 80);
  assert.equal(f.cached, false);
  assert.match(f.summary, /rain/i);
});

test('falls back to the cached forecast when the service fails', async () => {
  const f = await getEveningForecast({ fetch: async () => { throw new Error('offline'); } });
  assert.deepEqual(f, CACHED_FORECAST);
  assert.equal(f.cached, true);
});

test('falls back when the service answers with an error status', async () => {
  const f = await getEveningForecast({ fetch: async () => ({ ok: false, json: async () => ({}) }) });
  assert.equal(f.cached, true);
});
