import { describe, expect, it } from 'vitest';
import { BASE_MASK, E, N, S, TileKind, W, bit, hasOpening, rotateMask, tileFromMask, tileMask } from '../src/game/tiles';

describe('tiles', () => {
  it('rotates openings clockwise', () => {
    expect(rotateMask(bit(N), 1)).toBe(bit(E));
    expect(rotateMask(bit(W), 1)).toBe(bit(N));
    expect(rotateMask(bit(N) | bit(E), 2)).toBe(bit(S) | bit(W));
    expect(rotateMask(bit(N) | bit(S), 4)).toBe(bit(N) | bit(S));
  });

  it('keeps the number of openings when turned', () => {
    const count = (m: number) => m.toString(2).replace(/0/g, '').length;
    for (const kind of Object.keys(BASE_MASK) as TileKind[]) {
      for (let rot = 0; rot < 9; rot++) {
        expect(count(tileMask({ kind, rot }))).toBe(count(BASE_MASK[kind]));
      }
    }
  });

  it('reads openings of a turned piece', () => {
    const elbow = { kind: 'elbow' as const, rot: 1 }; // N+E -> E+S
    expect(hasOpening(elbow, E)).toBe(true);
    expect(hasOpening(elbow, S)).toBe(true);
    expect(hasOpening(elbow, N)).toBe(false);
  });

  it('finds a piece for every opening mask with 0 or 2+ openings', () => {
    for (let mask = 0; mask < 16; mask++) {
      const openings = mask.toString(2).replace(/0/g, '').length;
      if (openings === 1) {
        expect(() => tileFromMask(mask)).toThrow();
      } else {
        expect(tileMask(tileFromMask(mask))).toBe(mask);
      }
    }
  });
});
