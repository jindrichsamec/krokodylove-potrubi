export const MAX_LEVEL = 100;
export const LEVELS_PER_CROC = 10;

export interface LevelConfig {
  cols: number;
  rows: number;
  crocs: number;
  /** Bathtubs in the house right of the pipe wall (one per row at most). */
  rightTubs: number;
  /** Bathtubs in the second house, left of the pipe wall. */
  leftTubs: number;
  /** Chance that a cell outside the solution holds a spare pipe piece. */
  decoyChance: number;
  /** How many solution pieces start turned wrong; Infinity = every piece gets a random turn. */
  wrongTiles: number;
}

/**
 * Difficulty curve: every ten levels one more crocodile waits for water
 * (levels 1-10 one, 11-20 two, ... 91-100 ten), on boards that grow with them.
 */
export function levelConfig(n: number): LevelConfig {
  const crocs = Math.min(MAX_LEVEL / LEVELS_PER_CROC, Math.max(1, Math.ceil(n / LEVELS_PER_CROC)));

  let size: [number, number];
  if (n <= 3) size = [4, 3];
  else if (n <= 6) size = [5, 3];
  else if (n <= 15) size = [5, 4];
  else if (n <= 30) size = [6, 4];
  else if (n <= 40) size = [6, 5];
  else size = [7, 5];
  const [cols, rows] = size;

  // One house holds a bathtub per row; more crocodiles than rows need the second house.
  const rightTubs = crocs <= rows ? crocs : Math.ceil(crocs / 2);

  return {
    cols,
    rows,
    crocs,
    rightTubs,
    leftTubs: crocs - rightTubs,
    decoyChance: n <= 5 ? 0 : Math.min(0.6, 0.1 + 0.005 * n),
    wrongTiles: n === 1 ? 2 : n === 2 ? 3 : Infinity,
  };
}
