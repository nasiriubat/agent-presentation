import express from 'express';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createOpenAI } from './openai.js';
import { runAgent } from './agent.js';
import { createDemo1Tools } from './tools/demo1.js';

const DATA = fileURLToPath(new URL('../public/data/', import.meta.url));
const load = (name) => JSON.parse(readFileSync(DATA + name, 'utf8'));

const DEMO1_SYSTEM = `You are Brightloop's assistant. Use the tools to answer from the company notes and team table.
Budgets are per team, not per person. Before each tool call, write one short plain-English sentence saying what you're about to do and why.
Never do arithmetic in your head: use the calculator. If the notes don't contain the answer, say so plainly.
Keep the final answer to one or two sentences.`;

const PLAIN_SYSTEM = 'You are a plain chatbot with no tools. If asked to do something in the world, say honestly that you can only answer with text. Keep it to two sentences.';

// Streams emitted events to the client as server-sent events.
export function sse(res) {
  res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
  return {
    send: (e) => res.write(`data: ${JSON.stringify(e)}\n\n`),
    end: () => res.end(),
  };
}

export function createRouter({ env, openai = createOpenAI({ apiKey: env.OPENAI_API_KEY }) }) {
  const router = express.Router();

  router.get('/api/health', (req, res) => {
    res.json({ ok: true, live: true });
  });

  router.post('/api/chat/plain', async (req, res) => {
    try {
      const r = await openai.responses({ model: 'gpt-6-luna', instructions: PLAIN_SYSTEM, input: String(req.body.text ?? ''), store: false });
      const text = r.output_text ?? r.output.filter((o) => o.type === 'message').flatMap((o) => o.content).map((c) => c.text).join('');
      res.json({ text });
    } catch (err) {
      res.status(502).json({ error: err.message });
    }
  });

  router.post('/api/agent/run', async (req, res) => {
    const stream = sse(res);
    const memory = Array.isArray(req.body.memory) ? [...req.body.memory] : [];
    try {
      await runAgent({
        openai,
        system: DEMO1_SYSTEM,
        tools: createDemo1Tools({ notes: load('notes.json'), db: load('db.json'), memory }),
        question: String(req.body.question ?? ''),
        emit: stream.send,
      });
    } catch (err) {
      stream.send({ type: 'warn', text: `The agent stopped: ${err.message}` });
    }
    stream.end();
  });

  return router;
}
