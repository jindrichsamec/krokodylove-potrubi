/**
 * One shared AudioContext. iOS only lets audio start from a finished touch,
 * so the context is created on the first tap and everything stays silent until then.
 */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
const readyCallbacks: (() => void)[] = [];

const VOLUME = 0.9;

export interface AudioOut {
  ctx: AudioContext;
  out: GainNode;
}

/** The running audio output, or null while audio is still locked. */
export function audioOut(): AudioOut | null {
  return ctx && master && ctx.state === 'running' ? { ctx, out: master } : null;
}

export function onAudioReady(callback: () => void): void {
  readyCallbacks.push(callback);
}

function unlock(): void {
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : VOLUME;
    master.connect(ctx.destination);
  }
  const flush = () => {
    if (ctx?.state !== 'running') return;
    for (const callback of readyCallbacks.splice(0)) callback();
  };
  if (ctx.state === 'running') flush();
  else if (document.visibilityState === 'visible') void ctx.resume().then(flush);
}

export function initAudio(startMuted: boolean): void {
  muted = startMuted;
  for (const type of ['pointerup', 'touchend', 'click', 'keydown']) {
    document.addEventListener(type, unlock, { passive: true });
  }
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.visibilityState === 'hidden') void ctx.suspend();
    else void ctx.resume();
  });
}

export function setMuted(value: boolean): void {
  muted = value;
  if (ctx && master) {
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setTargetAtTime(value ? 0 : VOLUME, ctx.currentTime, 0.08);
  }
}

export const midiToHz = (midi: number): number => 440 * 2 ** ((midi - 69) / 12);

/** A soft music-box note: sine with a quiet octave, fast attack, long fade. */
export function chime(a: AudioOut, dest: AudioNode, time: number, midi: number, gain: number, length: number): void {
  const env = a.ctx.createGain();
  env.gain.setValueAtTime(0.0001, time);
  env.gain.linearRampToValueAtTime(gain, time + 0.012);
  env.gain.exponentialRampToValueAtTime(0.0001, time + length);
  env.connect(dest);

  const base = a.ctx.createOscillator();
  base.type = 'sine';
  base.frequency.value = midiToHz(midi);
  base.connect(env);

  const overtone = a.ctx.createOscillator();
  overtone.type = 'sine';
  overtone.frequency.value = midiToHz(midi + 12);
  const overtoneGain = a.ctx.createGain();
  overtoneGain.gain.setValueAtTime(0.22, time);
  overtoneGain.gain.exponentialRampToValueAtTime(0.001, time + length * 0.4);
  overtone.connect(overtoneGain).connect(env);

  for (const osc of [base, overtone]) {
    osc.start(time);
    osc.stop(time + length + 0.05);
  }
}
