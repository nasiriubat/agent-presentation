// Records a live finale (mixed audio + timed board calls) into replay files.

export class ReplayRecorder {
  constructor({ stream }) {
    this.stream = stream;
    this.events = [];
    this.chunks = [];
  }

  start() {
    this.t0 = performance.now();
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
    this.mr = new MediaRecorder(this.stream, { mimeType });
    this.mr.ondataavailable = (e) => e.data.size && this.chunks.push(e.data);
    this.mr.start(1000);
  }

  log(m, a) {
    this.events.push({ t: Math.round(performance.now() - this.t0), m, a: JSON.parse(JSON.stringify(a)) });
  }

  async stop() {
    await new Promise((resolve) => { this.mr.onstop = resolve; this.mr.stop(); });
    const eventsJson = JSON.stringify(this.events, null, 1);
    const audioBlob = new Blob(this.chunks, { type: 'audio/webm' });
    download(new Blob([eventsJson], { type: 'application/json' }), 'events.json');
    download(audioBlob, 'audio.webm');
    return { eventsJson, audioBlob };
  }
}

function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
