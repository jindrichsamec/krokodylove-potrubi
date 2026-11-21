import { Board, Port, computeFlow } from './flow';
import { levelConfig } from './levels';
import { Rng, createRng, randInt, shuffle } from './rng';
import { DIRS, DX, DY, E, N, Tile, TileKind, W, bit, opposite, tileFromMask, tileMask } from './tiles';

export interface Level extends Board {
  n: number;
  /** A rotation per tile that brings water to every bathtub. */
  solution: number[];
  /** Cells that carry water in the solution. */
  onPath: boolean[];
}

/**
 * Random spanning tree of the grid, as a parent index per cell (-1 for the root).
 * `winding` grows it depth-first (long twisty pipes); otherwise it grows from a
 * random frontier cell (shorter, bushier pipes).
 */
function spanningTree(rng: Rng, cols: number, rows: number, root: number, winding: boolean): number[] {
  const parent = new Array<number>(cols * rows).fill(-2);
  parent[root] = -1;
  const open = [root];

  while (open.length > 0) {
    const pick = winding ? open.length - 1 : randInt(rng, open.length);
    const cell = open[pick];
    const x = cell % cols;
    const y = Math.floor(cell / cols);

    const free: number[] = [];
    for (const d of DIRS) {
      const nx = x + DX[d];
      const ny = y + DY[d];
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      if (parent[ny * cols + nx] === -2) free.push(ny * cols + nx);
    }

    if (free.length === 0) {
      open.splice(pick, 1);
      continue;
    }
    const next = free[randInt(rng, free.length)];
    parent[next] = cell;
    open.push(next);
  }
  return parent;
}

function dirBetween(from: number, to: number, cols: number) {
  const dx = (to % cols) - (from % cols);
  const dy = Math.floor(to / cols) - Math.floor(from / cols);
  return DIRS.find((d) => DX[d] === dx && DY[d] === dy)!;
}

const DECOY_KINDS: TileKind[] = ['straight', 'elbow', 'elbow', 'tee'];

/** Builds level `n`. Deterministic: the same number always gives the same puzzle. */
export function generateLevel(n: number): Level {
  const cfg = levelConfig(n);
  const { cols, rows } = cfg;
  const rng = createRng(n);

  // The tap feeds a cell of the top row; bathtubs hang off the right and left columns.
  const pickRows = (count: number) =>
    shuffle(rng, Array.from({ length: rows }, (_, r) => r))
      .slice(0, count)
      .sort((a, b) => a - b);
  // With a single house the tap stays over the far half, so the pipe has some way to go.
  const sourceCols = cfg.leftTubs > 0 ? cols : Math.ceil(cols / 2);
  const source: Port = { index: randInt(rng, sourceCols), dir: N };
  const tubs: Port[] = [
    ...pickRows(cfg.rightTubs).map((r) => ({ index: r * cols + cols - 1, dir: E })),
    ...pickRows(cfg.leftTubs).map((r) => ({ index: r * cols, dir: W })),
  ];

  // 1. Spanning tree from the tap, 2. keep only the branches that reach a bathtub.
  const root = source.index;
  const winding = n > 3 && rng() < 0.5;
  const parent = spanningTree(rng, cols, rows, root, winding);

  const onPath = new Array<boolean>(cols * rows).fill(false);
  const masks = new Array<number>(cols * rows).fill(0);
  masks[root] |= bit(source.dir);
  for (const tub of tubs) {
    let cell = tub.index;
    masks[cell] |= bit(tub.dir);
    while (!onPath[cell]) {
      onPath[cell] = true;
      const up = parent[cell];
      if (up < 0) break;
      const d = dirBetween(cell, up, cols);
      masks[cell] |= bit(d);
      masks[up] |= bit(opposite(d));
      cell = up;
    }
  }

  // 3. Pieces: the solution, plus spare pieces on harder levels.
  const solved: Tile[] = masks.map((mask, i) => {
    if (onPath[i]) return tileFromMask(mask);
    if (rng() < cfg.decoyChance) {
      return { kind: DECOY_KINDS[randInt(rng, DECOY_KINDS.length)], rot: randInt(rng, 4) };
    }
    return { kind: 'empty', rot: 0 };
  });
  const solution = solved.map((t) => t.rot);

  // 4. Turn the pieces so the child has something to fix.
  const pathCells = onPath.flatMap((on, i) => (on && solved[i].kind !== 'cross' ? [i] : []));
  const turnWrong = (t: Tile): Tile => {
    const target = tileMask(t);
    let rot = t.rot;
    do rot = randInt(rng, 4);
    while (tileMask({ kind: t.kind, rot }) === target);
    return { kind: t.kind, rot };
  };

  let tiles: Tile[] = solved;
  for (let attempt = 0; attempt < 50; attempt++) {
    tiles = solved.map((t) => ({ ...t }));
    if (Number.isFinite(cfg.wrongTiles)) {
      for (const i of shuffle(rng, [...pathCells]).slice(0, cfg.wrongTiles)) tiles[i] = turnWrong(tiles[i]);
    } else {
      for (const i of pathCells) tiles[i].rot = randInt(rng, 4);
      for (let i = 0; i < tiles.length; i++) {
        if (!onPath[i] && tiles[i].kind !== 'empty') tiles[i].rot = randInt(rng, 4);
      }
    }
    if (!computeFlow({ cols, rows, source, tubs, tiles }).solved) break;
  }

  return { n, cols, rows, source, tubs, tiles, solution, onPath };
}
