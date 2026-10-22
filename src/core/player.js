// Plays a list of events either step by step (presenter presses →) or on its own timeline.

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class EventPlayer {
  constructor(events, onEvent) {
    this.events = events;
    this.onEvent = onEvent;
    this.i = 0;
    this.stopped = false;
  }

  get done() {
    return this.i >= this.events.length;
  }

  // Emits the next event and everything after it up to (not including) the next step marker.
  // Resolves to true while more events remain.
  async step() {
    if (this.done) return false;
    do {
      await this.onEvent(this.events[this.i++]);
    } while (!this.done && !this.events[this.i].step);
    return !this.done;
  }

  // Plays on from the current position until the end or stop(). Resolves when it stops.
  async autoplay() {
    this.stopped = false;
    let last = this.i > 0 ? this.events[this.i - 1].t ?? 0 : 0;
    while (!this.done && !this.stopped) {
      const e = this.events[this.i];
      if (e.t !== undefined) {
        await sleep(Math.max(0, e.t - last));
        if (this.stopped) break; // paused during the gap: the event stays queued for later
        last = e.t;
      }
      this.i++;
      await this.onEvent(e);
    }
  }

  stop() {
    this.stopped = true;
  }

  reset() {
    this.stop();
    this.i = 0;
  }
}
