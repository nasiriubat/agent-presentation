// Rejects if a promise hasn't settled in time, so nothing on stage can wait forever.
export function withTimeout(promise, ms, message = 'timed out') {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(message)), ms); }),
  ]).finally(() => clearTimeout(timer));
}
