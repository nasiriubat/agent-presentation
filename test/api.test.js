import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApi } from '../src/core/api.js';

function serve(handler) {
  return new Promise((resolve) => {
    const s = http.createServer(handler).listen(0, () => resolve(s));
  });
}

test('health() reports not live when the server never answers', async () => {
  const s = await serve(() => {});
  const api = createApi(`http://localhost:${s.address().port}`);
  const start = Date.now();
  assert.deepEqual(await api.health(100), { live: false });
  assert.ok(Date.now() - start < 300);
  s.closeAllConnections(); s.close();
});

test('health() reports live when the server says so', async () => {
  const s = await serve((req, res) => res.end(JSON.stringify({ ok: true, live: true })));
  const api = createApi(`http://localhost:${s.address().port}`);
  assert.deepEqual(await api.health(500), { live: true });
  s.close();
});

test('health() reports not live when nothing listens', async () => {
  const api = createApi('http://localhost:1');
  assert.deepEqual(await api.health(300), { live: false });
});

test('sse() parses data lines and finishes with done', async () => {
  const s = await serve((req, res) => {
    res.writeHead(200, { 'content-type': 'text/event-stream' });
    res.write('data: {"type":"user","text":"a"}\n\n');
    res.write('data: {"type":"answer","text":"b"}\n\n');
    res.end();
  });
  const api = createApi(`http://localhost:${s.address().port}`);
  const seen = [];
  await new Promise((resolve) => api.sse('/x', {}, (e) => { seen.push(e.type); if (e.type === 'done') resolve(); }));
  assert.deepEqual(seen, ['user', 'answer', 'done']);
  s.close();
});
