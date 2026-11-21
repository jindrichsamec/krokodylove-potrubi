import { audioOut, chime } from './context';

/** Short, soft effects. Every call is a no-op until audio is unlocked. */

function blip(from: number, to: number, length: number, gain: number): void {
  const a = audioOut();
  if (!a) return;
  const t = a.ctx.currentTime;
  const osc = a.ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(to, t + length);
  const env = a.ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.linearRampToValueAtTime(gain, t + 0.008);
  env.gain.exponentialRampToValueAtTime(0.0001, t + length);
  osc.connect(env).connect(a.out);
  osc.start(t);
  osc.stop(t + length + 0.02);
}

/** Wooden "tok" when a pipe piece turns. */
export const turn = (): void => blip(560, 340, 0.09, 0.2);

/** Button tap. */
export const tap = (): void => blip(420, 620, 0.1, 0.14);

/** The tap wheel opening. */
export const valve = (): void => blip(240, 420, 0.3, 0.14);

/** Water reaching a bathtub. */
export const splash = (): void => blip(320, 700, 0.22, 0.16);

/** The pipe did not reach everyone: a quiet two-note "hm-hm", nothing scolding. */
export function tryAgain(): void {
  const a = audioOut();
  if (!a) return;
  const t = a.ctx.currentTime;
  chime(a, a.out, t, 64, 0.12, 0.7);
  chime(a, a.out, t + 0.22, 60, 0.12, 0.9);
}

/** Every crocodile has water. */
export function win(): void {
  const a = audioOut();
  if (!a) return;
  const t = a.ctx.currentTime;
  [72, 76, 79, 84].forEach((midi, i) => chime(a, a.out, t + i * 0.16, midi, 0.2, 1.6));
}

let water: { stop: () => void } | null = null;

/** Running water: filtered noise that fades in and keeps going until `stopWater`. */
export function startWater(): void {
  const a = audioOut();
  if (!a || water) return;
  const t = a.ctx.currentTime;

  const buffer = a.ctx.createBuffer(1, a.ctx.sampleRate * 2, a.ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const noise = a.ctx.createBufferSource();
  noise.buffer = buffer;
  noise.loop = true;

  const band = a.ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 850;
  band.Q.value = 0.8;

  // A slow wobble so it gurgles instead of hissing.
  const wobble = a.ctx.createOscillator();
  wobble.frequency.value = 0.9;
  const wobbleDepth = a.ctx.createGain();
  wobbleDepth.gain.value = 260;
  wobble.connect(wobbleDepth).connect(band.frequency);

  const env = a.ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.linearRampToValueAtTime(0.09, t + 0.5);

  noise.connect(band).connect(env).connect(a.out);
  noise.start(t);
  wobble.start(t);

  water = {
    stop: () => {
      const now = a.ctx.currentTime;
      env.gain.cancelScheduledValues(now);
      env.gain.setTargetAtTime(0.0001, now, 0.2);
      noise.stop(now + 1);
      wobble.stop(now + 1);
    },
  };
}

export function stopWater(): void {
  water?.stop();
  water = null;
}
