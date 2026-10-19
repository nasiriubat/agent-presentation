// Thin wrapper over the three OpenAI endpoints the stage server needs.

export function createOpenAI({ apiKey, fetch = globalThis.fetch, base = 'https://api.openai.com/v1', timeoutMs = 25000 }) {
  async function post(path, body) {
    const res = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) {
      const err = new Error(`OpenAI ${path} ${res.status}: ${await res.text()}`);
      err.status = res.status;
      throw err;
    }
    return res;
  }

  return {
    responses: async (body) => (await post('/responses', body)).json(),
    tts: async ({ text, voice, instructions, model = 'gpt-4o-mini-tts' }) =>
      Buffer.from(await (await post('/audio/speech', { model, input: text, voice, ...(instructions ? { instructions } : {}), response_format: 'mp3' })).arrayBuffer()),
    clientSecret: async (body) => (await post('/realtime/client_secrets', body)).json(),
  };
}
