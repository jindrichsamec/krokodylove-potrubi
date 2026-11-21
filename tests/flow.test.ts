import { describe, expect, it } from 'vitest';
import { Board, Port, computeFlow } from '../src/game/flow';
import { E, N, S, Tile, W, bit, tileFromMask } from '../src/game/tiles';

const EW = bit(E) | bit(W);
const NS = bit(N) | bit(S);
const t = (mask: number): Tile => tileFromMask(mask);
const board = (cols: number, rows: number, source: Port, tubs: Port[], masks: number[]): Board => ({
  cols,
  rows,
  source,
  tubs,
  tiles: masks.map(t),
});
const fromLeft: Port = { index: 0, dir: W };

describe('computeFlow', () => {
  it('carries water along a straight pipe to the bathtub', () => {
    const flow = computeFlow(board(3, 1, fromLeft, [{ index: 2, dir: E }], [EW, EW, EW]));
    expect(flow.solved).toBe(true);
    expect(flow.cells.map((c) => c.depth)).toEqual([0, 1, 2]);
    expect(flow.tubs).toEqual([{ tub: 0, depth: 3 }]);
    expect(flow.cells.every((c) => c.leaks.length === 0)).toBe(true);
  });

  it('does not start when the first piece is turned away from the tap', () => {
    const flow = computeFlow(board(3, 1, fromLeft, [{ index: 2, dir: E }], [NS, EW, EW]));
    expect(flow.blockedAtSource).toBe(true);
    expect(flow.cells).toEqual([]);
    expect(flow.solved).toBe(false);
  });

  it('stops and leaks where the next piece does not connect', () => {
    const flow = computeFlow(board(3, 1, fromLeft, [{ index: 2, dir: E }], [EW, NS, EW]));
    expect(flow.solved).toBe(false);
    expect(flow.cells.map((c) => c.index)).toEqual([0]);
    expect(flow.cells[0].leaks).toEqual([E]);
  });

  it('needs every bathtub, not just one', () => {
    // 2x2: tap on the left of row 0, bathtubs right of both rows.
    const tubs: Port[] = [
      { index: 1, dir: E },
      { index: 3, dir: E },
    ];
    const split = [EW, bit(W) | bit(E) | bit(S), 0, bit(N) | bit(E)];
    expect(computeFlow(board(2, 2, fromLeft, tubs, split)).solved).toBe(true);

    const oneOnly = [EW, EW, 0, bit(N) | bit(E)];
    const flow = computeFlow(board(2, 2, fromLeft, tubs, oneOnly));
    expect(flow.solved).toBe(false);
    expect(flow.tubs).toEqual([{ tub: 0, depth: 2 }]);
  });

  it('counts an opening at the board edge as a leak, except at tap and bathtubs', () => {
    // Bathtub only on row 1; row 0 ends in an open pipe at the right edge.
    const masks = [bit(W) | bit(E) | bit(S), EW, bit(N) | bit(E), EW];
    const flow = computeFlow(board(2, 2, fromLeft, [{ index: 3, dir: E }], masks));
    expect(flow.solved).toBe(true);
    expect(flow.cells.find((c) => c.index === 1)!.leaks).toEqual([E]);
    expect(flow.cells.find((c) => c.index === 0)!.leaks).toEqual([]);
  });

  it('handles loops without visiting a cell twice', () => {
    const masks = [bit(W) | bit(E) | bit(S), bit(W) | bit(S) | bit(E), bit(N) | bit(E), bit(N) | bit(W)];
    const flow = computeFlow(board(2, 2, fromLeft, [{ index: 1, dir: E }], masks));
    expect(flow.cells).toHaveLength(4);
    expect(flow.solved).toBe(true);
  });

  it('feeds from the top and drains to bathtubs on both sides', () => {
    // 3x2: tap above the middle column, one bathtub left of row 1, one right of row 1.
    const tubs: Port[] = [
      { index: 5, dir: E },
      { index: 3, dir: W },
    ];
    const masks = [0, NS, 0, EW, bit(N) | bit(E) | bit(W), EW];
    const flow = computeFlow(board(3, 2, { index: 1, dir: N }, tubs, masks));
    expect(flow.solved).toBe(true);
    expect(flow.tubs.map((x) => x.tub).sort()).toEqual([0, 1]);
    expect(flow.cells[0]).toMatchObject({ index: 1, entry: N, depth: 0 });
  });

  it('only fills a bathtub through its own side of the cell', () => {
    // Corner cell 0 leaks west; the bathtub hangs off the east side of cell 1.
    const flow = computeFlow(board(2, 1, { index: 0, dir: N }, [{ index: 1, dir: E }], [bit(N) | bit(W), EW]));
    expect(flow.solved).toBe(false);
    expect(flow.cells[0].leaks).toEqual([W]);
  });
});
