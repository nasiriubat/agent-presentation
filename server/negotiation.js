// Two agents negotiate a table out loud. Live, but boxed in: strict turns, a turn cap,
// a time budget, and a pre-voiced fallback that always reaches a booking.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const MAX_LIVE_TURNS = 8;

// Rejects if the promise hasn't settled within ms, so one slow API call can't stall the stage.
function withDeadline(promise, ms) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('turn deadline')), Math.max(0, ms)); }),
  ]).finally(() => clearTimeout(timer));
}

const YOURS_SCHEMA = {
  type: 'object',
  properties: { say: { type: 'string' }, accept: { type: 'boolean' } },
  required: ['say', 'accept'],
  additionalProperties: false,
};

const RESTAURANT_SCHEMA = {
  type: 'object',
  properties: {
    say: { type: 'string' },
    status: { type: 'string', enum: ['open', 'agreed', 'declined'] },
    time: { type: ['string', 'null'] },
    seating: { type: ['string', 'null'], enum: ['terrace', 'indoors', null] },
  },
  required: ['say', 'status', 'time', 'seating'],
  additionalProperties: false,
};

function yoursSystem(r) {
  return `You are a personal AI agent phoning ${r.restaurant} to book dinner tonight for a team of ${r.partySize}.
${r.vegetarian} of them is vegetarian; the budget is €${r.budgetPerPerson} per person; you'd like ${r.preferredTime}.
The rain chance this evening is ${r.rainChancePct}%: accept the terrace only if it is below 40%.
You must make sure there is a vegetarian option. Be polite and natural, max 2 short sentences, spoken style.
Always speak English.
Set accept=true once you agree to a concrete time and seating.`;
}

const RESTAURANT_SYSTEM = `You are the host at Ravintola Näsi in Tampere, answering the phone.
Tonight: 19:00 is available only on the terrace; 20:30 is available indoors. A vegetarian menu is available (about €38 per person).
Be friendly, max 2 short sentences, spoken style. Always speak English.
Set status "agreed" only after the caller has accepted a concrete time and seating; then fill time ("19:00" or "20:30") and seating. Otherwise status "open" and time/seating null.`;

// tts-1 is the backup when a gpt-4o-mini-tts request stalls; it has its own voice names.
const BACKUP_VOICES = { yours: 'nova', restaurant: 'onyx' };

const VOICES = {
  yours: { voice: 'marin', instructions: 'Friendly, efficient personal assistant on a phone call.' },
  restaurant: { voice: 'cedar', instructions: 'Warm, quick restaurant host on the phone, speaking English.' },
};

function parseReply(res) {
  const text = res.output_text ?? (res.output ?? []).filter((o) => o.type === 'message').flatMap((o) => o.content).map((c) => c.text).join('');
  return JSON.parse(text);
}

export async function runNegotiation({ openai, request, emit, now = Date.now, budgetMs = 40000, ttsTimeoutMs = 8000, fallbackDir }) {
  const start = now();
  const transcript = [];
  let liveTurns = 0;
  let reason = 'no agreement within the turn limit';

  const ask = async (speaker) => {
    const isYours = speaker === 'yours';
    const history = transcript.map((t) => `${t.speaker === 'yours' ? 'Caller' : 'Restaurant'}: ${t.text}`).join('\n') || '(the call has just connected)';
    const res = await openai.responses({
      model: 'gpt-6-luna',
      instructions: isYours ? yoursSystem(request) : RESTAURANT_SYSTEM,
      input: `Call so far:\n${history}\n\nYour next line:`,
      text: { format: { type: 'json_schema', name: isYours ? 'caller_turn' : 'host_turn', schema: isYours ? YOURS_SCHEMA : RESTAURANT_SCHEMA, strict: true } },
      reasoning: { effort: 'low' },
      store: false,
    });
    return parseReply(res);
  };

  try {
    for (let n = 0; n < MAX_LIVE_TURNS; n++) {
      const left = budgetMs - (now() - start);
      if (left <= 0) throw new Error('time budget exceeded');
      const speaker = n % 2 === 0 ? 'yours' : 'restaurant';
      const { reply, audio } = await withDeadline((async () => {
        const reply = await ask(speaker);
        const audio = await withDeadline(openai.tts({ text: reply.say, ...VOICES[speaker] }), ttsTimeoutMs)
          .catch(() => withDeadline(openai.tts({ text: reply.say, voice: BACKUP_VOICES[speaker], model: 'tts-1' }), ttsTimeoutMs));
        return { reply, audio };
      })(), left);
      transcript.push({ speaker, text: reply.say });
      liveTurns++;
      emit({ type: 'negotiation.turn', speaker, text: reply.say, audioBase64: audio.toString('base64') });
      if (speaker === 'restaurant' && reply.status === 'agreed' && reply.time && reply.seating) {
        const booking = { restaurant: request.restaurant, time: reply.time, seating: reply.seating, partySize: request.partySize, vegetarian: true };
        emit({ type: 'negotiation.done', agreed: true, booking, fallback: false });
        return { agreed: true, booking, fallback: false };
      }
    }
  } catch (err) {
    reason = err.message; // fall through to the scripted ending
    console.warn(`[negotiation] fallback: ${reason}`);
  }

  const fallback = JSON.parse(readFileSync(join(fallbackDir, 'negotiation-fallback.json'), 'utf8'));
  const from = liveTurns < 2 ? 0 : 2;
  for (let i = from; i < fallback.turns.length; i++) {
    const audio = readFileSync(join(fallbackDir, 'negotiation-fallback', `turn-${i + 1}.mp3`));
    emit({ type: 'negotiation.turn', ...fallback.turns[i], audioBase64: audio.toString('base64') });
  }
  emit({ type: 'negotiation.done', agreed: true, booking: fallback.booking, fallback: true, reason });
  return { agreed: true, booking: fallback.booking, fallback: true };
}
