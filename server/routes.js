import express from 'express';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createOpenAI } from './openai.js';
import { runAgent } from './agent.js';
import { createDemo1Tools } from './tools/demo1.js';
import { getEveningForecast } from './weather.js';
import { sendInvite } from './telegram.js';

const DATA = fileURLToPath(new URL('../public/data/', import.meta.url));
const load = (name) => JSON.parse(readFileSync(DATA + name, 'utf8'));

const DEMO1_SYSTEM = `You are Brightloop's assistant. Use the tools to answer from the company notes and team table.
Budgets are per team, not per person. Before each tool call, write one short plain-English sentence saying what you're about to do and why.
Never do arithmetic in your head: use the calculator. If the notes don't contain the answer, say so plainly.
Keep the final answer to one or two sentences.`;

export const REALTIME_MODEL = 'gpt-realtime-2.1';

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

  router.get('/api/weather', async (req, res) => {
    res.json(await getEveningForecast());
  });

  router.post('/api/telegram', async (req, res) => {
    const who = req.body.who === 'aidul' ? 'AIDUL' : 'NASIR';
    res.json(await sendInvite({ token: env.TELEGRAM_BOT_TOKEN, chatId: env[`TELEGRAM_CHAT_ID_${who}`], text: String(req.body.text ?? '') }));
  });

  // Mints a short-lived key so the browser can talk to the Realtime API without ever seeing ours.
  router.post('/api/realtime/token', async (req, res) => {
    const { instructions = '', tools = [], voice = 'marin' } = req.body;
    const session = (withNoiseReduction) => ({
      session: {
        type: 'realtime',
        model: REALTIME_MODEL,
        instructions,
        tools,
        audio: {
          input: {
            turn_detection: { type: 'semantic_vad', eagerness: 'low', create_response: true, interrupt_response: false },
            transcription: { model: 'gpt-4o-mini-transcribe' },
            ...(withNoiseReduction ? { noise_reduction: { type: 'far_field' } } : {}),
          },
          output: { voice },
        },
      },
    });
    try {
      try {
        res.json(await openai.clientSecret(session(true)));
      } catch (err) {
        if (err.status !== 400 || !/noise_reduction/.test(err.message)) throw err;
        res.json(await openai.clientSecret(session(false)));
      }
    } catch (err) {
      res.status(502).json({ error: err.message });
    }
  });

  return router;
}
