export type Rng = () => number;

/** Small deterministic PRNG (mulberry32): the same seed always gives the same level. */
export function createRng(seed: number): Rng {
  let a = (seed * 0x9e3779b1 + 0x85ebca6b) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const randInt = (rng: Rng, n: number): number => Math.floor(rng() * n);

export function shuffle<T>(rng: Rng, items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = randInt(rng, i + 1);
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}
