// The one event format every demo speaks: live server streams and recorded replays alike.

const REQUIRED = {
  user: ['text'],
  think: ['text'],
  'tool.call': ['id', 'tool', 'args'],
  'tool.result': ['id', 'tool', 'result'],
  'memory.save': ['fact'],
  'memory.recall': ['fact'],
  'file.write': ['path', 'content', 'public'],
  answer: ['text'],
  warn: ['text'],
  guard: ['text'],
  approval: ['text', 'answer'],
  section: ['title'],
};

export const EVENT_TYPES = Object.keys(REQUIRED);

export function validateEvent(e) {
  if (!e || typeof e !== 'object') throw new Error('event must be an object');
  const fields = REQUIRED[e.type];
  if (!fields) throw new Error(`unknown event type: ${e.type}`);
  const missing = fields.filter((f) => e[f] === undefined);
  if (missing.length) throw new Error(`${e.type} event missing: ${missing.join(', ')}`);
  return true;
}
