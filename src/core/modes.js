import { api } from './api.js';

export function isPublic() {
  return import.meta.env?.VITE_PUBLIC === '1';
}

export function forcedReplay() {
  try {
    return globalThis.localStorage?.getItem('forceReplay') === '1';
  } catch {
    return false;
  }
}

export function setForcedReplay(on) {
  try {
    if (on) globalThis.localStorage?.setItem('forceReplay', '1');
    else globalThis.localStorage?.removeItem('forceReplay');
  } catch {}
}

export async function liveAvailable(client = api) {
  if (isPublic() || forcedReplay()) return false;
  return (await client.health()).live;
}
