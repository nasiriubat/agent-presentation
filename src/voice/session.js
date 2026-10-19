import { withTimeout } from '../core/timeout.js';

// A live speech-to-speech session with OpenAI Realtime over WebRTC, with tool calling.
// The browser never sees our API key: the local server mints a short-lived one.

export class RealtimeSession {
  constructor({ api, tools, handlers, instructions, voice = 'marin', onTranscript, onToolCall, onToolDone, onState, onEvent, onError, connectTimeoutMs = 12000 }) {
    Object.assign(this, { api, tools, handlers, instructions, voice, connectTimeoutMs });
    this.onError = onError ?? (() => {});
    this.onTranscript = onTranscript ?? (() => {});
    this.onToolCall = onToolCall ?? (() => {});
    this.onToolDone = onToolDone ?? (() => {});
    this.onState = onState ?? (() => {});
    this.onEvent = onEvent ?? (() => {});
    this.userMuted = false;
    this.holds = 0; // >0 while something (agent voice, negotiation) must not be heard by the mic
  }

  // Gives up with a clear error instead of hanging (token, SDP or data channel can stall on venue Wi-Fi).
  async connect() {
    try {
      await withTimeout(this.open(), this.connectTimeoutMs, 'Connecting to the voice model took too long');
    } catch (err) {
      this.close();
      throw err;
    }
  }

  async open() {
    const secret = await this.api.json('/api/realtime/token', { instructions: this.instructions, tools: this.tools, voice: this.voice });
    const key = secret.value ?? secret.client_secret?.value;
    if (!key) throw new Error('No realtime key from the server');

    this.pc = new RTCPeerConnection();
    this.audio = document.createElement('audio');
    this.audio.autoplay = true;
    this.pc.ontrack = (e) => { this.remoteStream = e.streams[0]; this.audio.srcObject = e.streams[0]; };
    this.mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    this.micTrack = this.mic.getTracks()[0];
    this.pc.addTrack(this.micTrack, this.mic);
    this.dc = this.pc.createDataChannel('oai-events');
    this.dc.onmessage = (m) => this.handle(JSON.parse(m.data));
    const opened = new Promise((resolve, reject) => {
      this.dc.onopen = resolve;
      this.pc.onconnectionstatechange = () => {
        const s = this.pc.connectionState;
        if (s === 'failed' || s === 'disconnected') {
          reject(new Error(`voice connection ${s}`));
          this.onError(`The voice connection ${s}.`);
        }
      };
    });

    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    const res = await fetch('https://api.openai.com/v1/realtime/calls', {
      method: 'POST',
      body: offer.sdp,
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/sdp' },
    });
    if (!res.ok) throw new Error(`Realtime connection failed (${res.status})`);
    await this.pc.setRemoteDescription({ type: 'answer', sdp: await res.text() });
    await opened;
    this.applyMic();
  }

  send(event) {
    if (this.dc?.readyState === 'open') this.dc.send(JSON.stringify(event));
  }

  // The user's mute button.
  mute(on) {
    this.userMuted = on;
    if (!on) { this.holds = 0; this.speaking = false; } // unmuting is also the presenter's "un-stick the mic"
    this.applyMic();
  }

  // Temporarily deafen the mic, e.g. while voices play through the room speakers.
  hold() { this.holds++; this.applyMic(); }
  release() { this.holds = Math.max(0, this.holds - 1); this.applyMic(); }

  applyMic() {
    const live = !this.userMuted && this.holds === 0;
    if (this.micTrack) this.micTrack.enabled = live;
    if (!live) this.send({ type: 'input_audio_buffer.clear' });
    this.onState(this.userMuted ? 'muted' : this.holds ? 'speaking' : 'listening');
  }

  async handle(e) {
    this.onEvent(e);
    switch (e.type) {
      case 'output_audio_buffer.started':
        if (!this.speaking) { this.speaking = true; this.hold(); }
        break;
      case 'output_audio_buffer.stopped':
      case 'output_audio_buffer.cleared':
        if (this.speaking) { this.speaking = false; this.release(); }
        break;
      case 'conversation.item.input_audio_transcription.completed':
        if (e.transcript?.trim()) this.onTranscript('user', e.transcript.trim());
        break;
      case 'response.output_audio_transcript.done':
        if (e.transcript?.trim()) this.onTranscript('assistant', e.transcript.trim());
        break;
      case 'response.done': {
        const calls = (e.response?.output ?? []).filter((o) => o.type === 'function_call');
        if (!calls.length) break;
        for (const c of calls) {
          let args = {};
          try { args = JSON.parse(c.arguments || '{}'); } catch {}
          this.onToolCall(c.name, args);
          let output;
          try {
            output = await (this.handlers[c.name]?.(args) ?? JSON.stringify({ error: `unknown tool ${c.name}` }));
          } catch (err) {
            output = JSON.stringify({ error: err.message });
          }
          this.onToolDone(c.name, args, output);
          this.send({ type: 'conversation.item.create', item: { type: 'function_call_output', call_id: c.call_id, output } });
        }
        this.send({ type: 'response.create' });
        break;
      }
      case 'error':
        console.warn('[realtime]', e.error?.message ?? e);
        this.onError(e.error?.message ?? 'voice error');
        break;
    }
  }

  close() {
    this.dc?.close();
    this.pc?.close();
    this.mic?.getTracks().forEach((t) => t.stop());
    this.onState('idle');
  }
}
