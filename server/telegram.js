// Sends the dinner invite to a speaker's phone. Never throws: the finale must go on.

export async function sendInvite({ fetch = globalThis.fetch, token, chatId, text, timeoutMs = 5000 }) {
  if (!token || !chatId) return { delivered: false, error: 'Telegram is not configured' };
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const body = await res.json();
    return body.ok ? { delivered: true } : { delivered: false, error: body.description ?? 'Telegram refused the message' };
  } catch (err) {
    return { delivered: false, error: err.message };
  }
}
