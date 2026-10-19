import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createRouter } from '../server/routes.js';

async function serve(deps) {
  const app = express();
  app.use(express.json());
  app.use(createRouter(deps));
  const server = await new Promise((r) => { const s = app.listen(0, () => r(s)); });
  return { url: `http://localhost:${server.address().port}`, close: () => server.close() };
}

test('selftest reports a working key and missing Telegram config', async () => {
  const s = await serve({ env: {}, openai: { responses: async () => ({ output_text: 'ok' }) } });
  try {
    const body = await (await fetch(`${s.url}/api/selftest`)).json();
    assert.deepEqual(body, { openai: true, telegramConfigured: false });
  } finally { s.close(); }
});

test('selftest reports a broken key without crashing', async () => {
  const s = await serve({ env: { TELEGRAM_BOT_TOKEN: 't', TELEGRAM_CHAT_ID_AIDUL: '1' }, openai: { responses: async () => { throw new Error('401'); } } });
  try {
    const body = await (await fetch(`${s.url}/api/selftest`)).json();
    assert.deepEqual(body, { openai: false, error: '401', telegramConfigured: true });
  } finally { s.close(); }
});
