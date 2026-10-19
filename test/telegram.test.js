import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sendInvite } from '../server/telegram.js';

test('reports delivered when Telegram accepts the message', async () => {
  let sent;
  const fetch = async (url, init) => { sent = { url, body: JSON.parse(init.body) }; return { json: async () => ({ ok: true }) }; };
  assert.deepEqual(await sendInvite({ fetch, token: 'T', chatId: '42', text: 'hi' }), { delivered: true });
  assert.equal(sent.url, 'https://api.telegram.org/botT/sendMessage');
  assert.deepEqual(sent.body, { chat_id: '42', text: 'hi' });
});

test('never throws when the network fails', async () => {
  const r = await sendInvite({ fetch: async () => { throw new Error('offline'); }, token: 'T', chatId: '42', text: 'hi' });
  assert.equal(r.delivered, false);
  assert.match(r.error, /offline/);
});

test('reports not delivered when the bot is not configured', async () => {
  const r = await sendInvite({ fetch: async () => { throw new Error('should not be called'); }, token: '', chatId: '', text: 'hi' });
  assert.deepEqual(r, { delivered: false, error: 'Telegram is not configured' });
});

test('reports Telegram error descriptions', async () => {
  const r = await sendInvite({ fetch: async () => ({ json: async () => ({ ok: false, description: 'chat not found' }) }), token: 'T', chatId: '1', text: 'x' });
  assert.deepEqual(r, { delivered: false, error: 'chat not found' });
});
