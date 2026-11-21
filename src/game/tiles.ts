/** Directions: 0 = north, 1 = east, 2 = south, 3 = west. */
export type Dir = 0 | 1 | 2 | 3;

export const DIRS: readonly Dir[] = [0, 1, 2, 3];
export const DX: readonly number[] = [0, 1, 0, -1];
export const DY: readonly number[] = [-1, 0, 1, 0];

export const N: Dir = 0;
export const E: Dir = 1;
export const S: Dir = 2;
export const W: Dir = 3;

export const opposite = (d: Dir): Dir => ((d + 2) % 4) as Dir;
export const bit = (d: Dir): number => 1 << d;

export type TileKind = 'empty' | 'straight' | 'elbow' | 'tee' | 'cross';

/** Openings of each piece at rotation 0, as a 4-bit mask (bit d = opening towards d). */
export const BASE_MASK: Record<TileKind, number> = {
  empty: 0,
  straight: bit(N) | bit(S),
  elbow: bit(N) | bit(E),
  tee: bit(N) | bit(E) | bit(S),
  cross: 15,
};

export interface Tile {
  kind: TileKind;
  /** Number of clockwise quarter turns. Grows without bound so the turn animation never rewinds. */
  rot: number;
}

/** Rotates an opening mask clockwise by `rot` quarter turns. */
export function rotateMask(mask: number, rot: number): number {
  const r = ((rot % 4) + 4) % 4;
  return ((mask << r) | (mask >> (4 - r))) & 15;
}

export const tileMask = (t: Tile): number => rotateMask(BASE_MASK[t.kind], t.rot);

export const hasOpening = (t: Tile, d: Dir): boolean => (tileMask(t) & bit(d)) !== 0;

/** Finds the piece and rotation that produce the given opening mask. */
export function tileFromMask(mask: number): Tile {
  const kinds: TileKind[] = ['empty', 'straight', 'elbow', 'tee', 'cross'];
  for (const kind of kinds) {
    for (let rot = 0; rot < 4; rot++) {
      if (rotateMask(BASE_MASK[kind], rot) === mask) return { kind, rot };
    }
  }
  throw new Error(`No pipe piece has openings ${mask.toString(2)}`);
}
