// Web Audio synth: every node is a key. No samples, no network: all generated in the browser.
let ctx = null, master = null;

export function ensureAudio() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0.5;
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp).connect(ctx.destination);
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);

function env(g, t, peak, attack, decay) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}
function osc(type, f, t, dur, dest, detune = 0) {
  const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = detune;
  o.connect(dest); o.start(t); o.stop(t + dur + 0.05); return o;
}

export const INSTRUMENTS = {
  piano: { label: "Piano", play(f, t) {
    const g = ctx.createGain(); env(g, t, 0.5, 0.005, 1.4); g.connect(master);
    osc("triangle", f, t, 1.5, g); osc("sine", f * 2, t, 0.6, g, 4);
  } },
  crystal: { label: "Crystal", play(f, t) {
    // FM bell: inharmonic modulator gives the glassy shimmer
    const g = ctx.createGain(); env(g, t, 0.4, 0.002, 2.2); g.connect(master);
    const car = osc("sine", f, t, 2.3, g);
    const mod = ctx.createOscillator(), mg = ctx.createGain();
    mod.frequency.value = f * 3.5; mg.gain.setValueAtTime(f * 2, t); mg.gain.exponentialRampToValueAtTime(1, t + 1.5);
    mod.connect(mg).connect(car.frequency); mod.start(t); mod.stop(t + 2.3);
  } },
  synth: { label: "Synth", play(f, t) {
    const g = ctx.createGain(); env(g, t, 0.25, 0.02, 0.9);
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.Q.value = 6;
    lp.frequency.setValueAtTime(f * 8, t); lp.frequency.exponentialRampToValueAtTime(f * 1.5, t + 0.6);
    lp.connect(g).connect(master);
    osc("sawtooth", f, t, 1, lp, -7); osc("sawtooth", f, t, 1, lp, 7);
  } },
  musicbox: { label: "Music box", play(f, t) {
    const g = ctx.createGain(); env(g, t, 0.35, 0.001, 0.8); g.connect(master);
    osc("sine", f * 2, t, 0.9, g); osc("sine", f * 4, t, 0.3, g);
  } },
};

export function playNote(midi, instrument = "piano", when = 0) {
  if (!ctx) return;
  INSTRUMENTS[instrument].play(hz(midi), ctx.currentTime + when);
}

// Main path = C major scale up the spiral (C4 → D5); branches = low chord tones.
export const NOTES = {
  ideate: 60, prompt: 62, follow: 64, adjust: 65, animate: 67, iterate: 69, preview: 71, export: 72, submit: 74,
  agent: 48, fills: 53, effects: 57, motion: 55, tools: 52, ai: 59, limits: 43,
};

// Public-domain melodies, written as node ids so the grid lights up with the music.
const N = (s) => s.split(" ");
export const TUNES = {
  ascend: { label: "Ascend", beat: 0.22, seq: N("ideate prompt follow adjust animate iterate preview export submit") },
  twinkle: { label: "Twinkle Twinkle", beat: 0.4, seq: N("ideate ideate animate animate iterate iterate animate - adjust adjust follow follow prompt prompt ideate") },
  ode: { label: "Ode to Joy", beat: 0.36, seq: N("follow follow adjust animate animate adjust follow prompt ideate ideate prompt follow follow - prompt prompt") },
  cascade: { label: "Crystal cascade", beat: 0.14, seq: N("submit export preview iterate animate adjust follow prompt ideate ai effects motion fills agent tools limits") },
};
