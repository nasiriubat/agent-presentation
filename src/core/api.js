// Client for the local stage server. Every call fails soft so the deck can fall back to replays.

export function createApi(base = 'http://localhost:8787') {
  async function health(timeoutMs = 1500) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(`${base}/api/health`, { signal: ctrl.signal });
      const body = await res.json();
      return { live: Boolean(body.live) };
    } catch {
      return { live: false };
    } finally {
      clearTimeout(timer);
    }
  }

  async function json(path, body, { method = body === undefined ? 'GET' : 'POST', timeoutMs = 10000 } = {}) {
    const res = await fetch(`${base}${path}`, {
      method,
      signal: AbortSignal.timeout(timeoutMs),
      headers: body === undefined ? {} : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`${path} failed: ${res.status} ${await res.text()}`);
    return res.json();
  }

  // POSTs body and streams back server-sent events. onEvent gets {type:'done'} at the end,
  // or {type:'error', message} if the stream breaks.
  function sse(path, body, onEvent) {
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch(`${base}${path}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error(`${path} failed: ${res.status}`);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          let idx;
          while ((idx = buf.indexOf('\n\n')) !== -1) {
            const chunk = buf.slice(0, idx);
            buf = buf.slice(idx + 2);
            for (const line of chunk.split('\n')) {
              if (line.startsWith('data: ')) await onEvent(JSON.parse(line.slice(6)));
            }
          }
        }
        await onEvent({ type: 'done' });
      } catch (err) {
        if (err.name !== 'AbortError') await onEvent({ type: 'error', message: err.message });
      }
    })();
    return { abort: () => ctrl.abort() };
  }

  return { base, health, json, sse };
}

export const api = createApi();
