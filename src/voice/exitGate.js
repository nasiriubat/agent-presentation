// A finale that never finished can still be left: two → presses within the window.
export function exitGate(windowMs = 1500) {
  let last = -Infinity;
  return (now = performance.now()) => {
    const leave = now - last <= windowMs;
    last = now;
    return leave;
  };
}
