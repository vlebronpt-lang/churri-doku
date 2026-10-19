/** Efectos de sonido sintetizados (sin archivos) y vibración. */

let ctx: AudioContext | null = null;
let enabled = true;
let hapticsOn = true;

export function configureFx(sound: boolean, haptics: boolean) {
  enabled = sound;
  hapticsOn = haptics;
}

function ac(): AudioContext | null {
  if (!enabled) return null;
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, dur: number, opts: { type?: OscillatorType; gain?: number; slide?: number; delay?: number } = {}) {
  const a = ac();
  if (!a) return;
  const t0 = a.currentTime + (opts.delay ?? 0);
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = opts.type ?? 'sine';
  o.frequency.setValueAtTime(freq, t0);
  if (opts.slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq * opts.slide), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(opts.gain ?? 0.12, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(a.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function noise(dur: number, gain = 0.08, delay = 0, hp = 1200) {
  const a = ac();
  if (!a) return;
  const t0 = a.currentTime + delay;
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = hp;
  const g = a.createGain();
  g.gain.value = gain;
  src.connect(f).connect(g).connect(a.destination);
  src.start(t0);
}

function buzz(ms: number | number[]) {
  if (!hapticsOn) return;
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* sin vibración */
  }
}

export const sfx = {
  place() { tone(520, 0.12, { slide: 0.6, gain: 0.14 }); buzz(12); },
  note() { tone(900, 0.05, { type: 'triangle', gain: 0.05 }); },
  x() { noise(0.07, 0.05, 0, 2500); buzz(6); },
  erase() { noise(0.12, 0.04, 0, 800); },
  undo() { tone(380, 0.1, { slide: 1.4, gain: 0.08, type: 'triangle' }); },
  select() { tone(660, 0.05, { type: 'triangle', gain: 0.05 }); },
  hint() { tone(740, 0.09, { gain: 0.08 }); tone(988, 0.12, { gain: 0.07, delay: 0.08 }); },
  error() { tone(160, 0.22, { type: 'sawtooth', gain: 0.05, slide: 0.8 }); buzz([30, 40, 30]); },
  ring(k: number) { tone(523 * Math.pow(1.122, k), 0.16, { gain: 0.07, type: 'triangle' }); },
  stamp() { tone(90, 0.25, { slide: 0.5, gain: 0.3 }); noise(0.15, 0.12, 0, 300); buzz([20, 60, 40]); },
  win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, { gain: 0.09, delay: i * 0.09, type: 'triangle' })); },
};
