import { DIRS, DX, DY, Dir, Tile, hasOpening, opposite } from './tiles';

/** A place where a pipe crosses the edge of the board: a border cell and the side it leaves through. */
export interface Port {
  index: number;
  dir: Dir;
}

/** The part of a level the water simulation needs. */
export interface Board {
  cols: number;
  rows: number;
  /** Where the tap feeds the board. */
  source: Port;
  /** Where the board drains into a bathtub. */
  tubs: Port[];
  /** Row-major. */
  tiles: Tile[];
}

export interface FlowCell {
  index: number;
  /** Steps from the tap; the source cell is 0. */
  depth: number;
  /** Side of the cell the water came in through. */
  entry: Dir;
  /** Openings where water runs out of the pipe. */
  leaks: Dir[];
}

export interface FlowResult {
  /** Cells that get water, nearest to the tap first. */
  cells: FlowCell[];
  /** Bathtubs that get water (index into `board.tubs`), with the step at which it arrives. */
  tubs: { tub: number; depth: number }[];
  /** True when the pipe does not even take water from the tap. */
  blockedAtSource: boolean;
  /** Every bathtub got water. */
  solved: boolean;
  maxDepth: number;
}

/** Follows the water from the tap through every connected pipe piece. */
export function computeFlow(board: Board): FlowResult {
  const { cols, rows, source, tubs, tiles } = board;
  const start = source.index;
  const result: FlowResult = { cells: [], tubs: [], blockedAtSource: false, solved: false, maxDepth: 0 };

  if (!hasOpening(tiles[start], source.dir)) {
    result.blockedAtSource = true;
    return result;
  }

  const seen = new Set<number>([start]);
  const queue: FlowCell[] = [{ index: start, depth: 0, entry: source.dir, leaks: [] }];

  for (let head = 0; head < queue.length; head++) {
    const cell = queue[head];
    const x = cell.index % cols;
    const y = Math.floor(cell.index / cols);
    result.maxDepth = Math.max(result.maxDepth, cell.depth);

    for (const d of DIRS) {
      if (!hasOpening(tiles[cell.index], d)) continue;
      if (cell.index === start && d === source.dir) continue; // the tap itself

      const nx = x + DX[d];
      const ny = y + DY[d];
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) {
        const tub = tubs.findIndex((t) => t.index === cell.index && t.dir === d);
        if (tub >= 0) result.tubs.push({ tub, depth: cell.depth + 1 });
        else cell.leaks.push(d);
        continue;
      }

      const next = ny * cols + nx;
      if (!hasOpening(tiles[next], opposite(d))) {
        cell.leaks.push(d);
      } else if (!seen.has(next)) {
        seen.add(next);
        queue.push({ index: next, depth: cell.depth + 1, entry: opposite(d), leaks: [] });
      }
    }
  }

  result.cells = queue;
  result.solved = result.tubs.length === tubs.length;
  return result;
}
