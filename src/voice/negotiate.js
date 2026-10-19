// Streams the two-agent call from the server and plays each turn in order. If the stream
// dies before any turn arrives, the pre-voiced scripted call plays from the static files.

export function createNegotiator({ api, board, playBase64, playUrl, loadFallback, hold = () => {}, release = () => {} }) {
  return (request) => new Promise((resolve) => {
    hold();
    board.negotiationStart();
    const queue = [];
    let booking, fallback, ended = false, playing = false, received = 0, finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      board.negotiationEnd();
      release();
      resolve({ booking, fallback });
    };

    const pump = async () => {
      if (playing) return;
      playing = true;
      while (queue.length) {
        const t = queue.shift();
        board.negotiationTurn(t.speaker, t.text);
        try { await (t.audioBase64 ? playBase64(t.audioBase64) : playUrl(t.url)); }
        catch { await new Promise((r) => setTimeout(r, 2500)); }
      }
      playing = false;
      if (ended) finish();
    };

    const scripted = async () => {
      try {
        const f = await loadFallback();
        f.turns.forEach((t, i) => queue.push({ ...t, url: `replays/negotiation-fallback/turn-${i + 1}.mp3` }));
        booking = f.booking;
      } catch {}
      fallback = true;
      ended = true;
      pump();
      if (!queue.length && !playing) finish();
    };

    api.sse('/api/negotiate', { request }, (e) => {
      if (e.type === 'negotiation.turn') { received++; queue.push(e); pump(); }
      else if (e.type === 'negotiation.done') { booking = e.booking; fallback = e.fallback; }
      else if (e.type === 'done' || e.type === 'error') {
        if (!received) return scripted();
        ended = true;
        if (!booking) booking = { restaurant: request.restaurant, time: '20:30', seating: 'indoors', partySize: request.partySize, vegetarian: true };
        if (!playing) finish();
      }
    });
  });
}
