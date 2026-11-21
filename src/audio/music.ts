import { AudioOut, audioOut, chime, midiToHz, onAudioReady } from './context';

/** Slow lullaby in C major pentatonic. 72 beats per minute, 16 bars, then it repeats. */
const BEAT = 60 / 72;

// [midi note, beats] — four phrases of four bars.
const MELODY: readonly (readonly [number, number])[] = [
  [76, 1], [72, 1], [67, 2], [74, 1], [72, 1], [69, 2], [67, 1], [69, 1], [72, 1], [74, 1], [72, 4],
  [76, 1], [72, 1], [67, 2], [74, 1], [76, 1], [79, 2], [76, 1], [74, 1], [72, 1], [69, 1], [72, 4],
  [69, 2], [72, 2], [67, 2], [64, 2], [69, 1], [72, 1], [74, 2], [67, 4],
  [76, 1], [72, 1], [67, 2], [74, 1], [72, 1], [69, 2], [67, 1], [64, 1], [62, 1], [64, 1], [60, 4],
];

// One soft two-note chord per bar.
const C = [48, 55];
const Am = [57, 64];
const F = [53, 60];
const G = [55, 62];
const CHORDS: readonly (readonly number[])[] = [C, Am, F, C, C, G, Am, C, F, C, F, G, C, Am, G, C];

interface Note {
  beat: number;
  play: (a: AudioOut, dest: AudioNode, time: number) => void;
}

function pad(a: AudioOut, dest: AudioNode, time: number, midi: number): void {
  const length = BEAT * 4;
  const osc = a.ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.value = midiToHz(midi);
  const env = a.ctx.createGain();
  env.gain.setValueAtTime(0.0001, time);
  env.gain.linearRampToValueAtTime(0.05, time + 0.5);
  env.gain.setValueAtTime(0.05, time + length - 0.9);
  env.gain.linearRampToValueAtTime(0.0001, time + length + 0.3);
  osc.connect(env).connect(dest);
  osc.start(time);
  osc.stop(time + length + 0.4);
}

function buildScore(): Note[] {
  const notes: Note[] = [];
  let beat = 0;
  for (const [midi, beats] of MELODY) {
    notes.push({ beat, play: (a, dest, time) => chime(a, dest, time, midi, 0.16, 1.2 + beats * 0.5) });
    beat += beats;
  }
  CHORDS.forEach((chord, bar) => {
    for (const midi of chord) notes.push({ beat: bar * 4, play: (a, dest, time) => pad(a, dest, time, midi) });
  });
  return notes.sort((x, y) => x.beat - y.beat);
}

const LOOP_BEATS = CHORDS.length * 4;

/** Starts the background music as soon as audio is unlocked. Safe to call once. */
export function startMusic(): void {
  onAudioReady(() => {
    const a = audioOut();
    if (!a) return;

    const bus = a.ctx.createGain();
    bus.gain.value = 0.55;
    const tone = a.ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 2600;
    bus.connect(tone).connect(a.out);

    // A quiet echo makes the notes feel like a room, not a beeper.
    const echo = a.ctx.createDelay(1);
    echo.delayTime.value = BEAT / 2;
    const feedback = a.ctx.createGain();
    feedback.gain.value = 0.28;
    const wet = a.ctx.createGain();
    wet.gain.value = 0.22;
    bus.connect(echo);
    echo.connect(feedback).connect(echo);
    echo.connect(wet).connect(tone);

    const score = buildScore();
    let loopStart = a.ctx.currentTime + 0.4;
    let next = 0;

    // Timers are unreliable, so notes are scheduled a little ahead on the audio clock.
    window.setInterval(() => {
      if (a.ctx.state !== 'running') return;
      const horizon = a.ctx.currentTime + 0.6;
      for (;;) {
        const note = score[next];
        const time = loopStart + note.beat * BEAT;
        if (time > horizon) break;
        if (time > a.ctx.currentTime - 0.05) note.play(a, bus, Math.max(time, a.ctx.currentTime));
        next += 1;
        if (next === score.length) {
          next = 0;
          loopStart += LOOP_BEATS * BEAT;
        }
      }
    }, 150);
  });
}
