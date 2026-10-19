// Voices the scripted negotiation fallback once (needs OPENAI_API_KEY). Outputs are committed.
import 'dotenv/config';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createOpenAI } from '../server/openai.js';

const VOICES = {
  yours: { voice: 'marin', instructions: 'Friendly, efficient personal assistant on a phone call.' },
  restaurant: { voice: 'cedar', instructions: 'Warm, quick restaurant host on the phone, speaking English.' },
};

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
const { turns } = JSON.parse(readFileSync('public/replays/negotiation-fallback.json', 'utf8'));
mkdirSync('public/replays/negotiation-fallback', { recursive: true });
for (const [i, t] of turns.entries()) {
  const audio = await openai.tts({ text: t.text, ...VOICES[t.speaker] });
  writeFileSync(`public/replays/negotiation-fallback/turn-${i + 1}.mp3`, audio);
  console.log(`turn-${i + 1}.mp3 ${audio.length} bytes`);
}
