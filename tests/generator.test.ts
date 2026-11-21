import { describe, expect, it } from 'vitest';
import { computeFlow } from '../src/game/flow';
import { generateLevel } from '../src/game/generator';
import { MAX_LEVEL, levelConfig } from '../src/game/levels';
import { E, N, W } from '../src/game/tiles';

const LEVELS = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1);

describe('levelConfig', () => {
  it('has 100 levels and adds a crocodile every ten', () => {
    expect(MAX_LEVEL).toBe(100);
    for (const n of LEVELS) expect(levelConfig(n).crocs, `level ${n}`).toBe(Math.ceil(n / 10));
    expect(levelConfig(1).crocs).toBe(1);
    expect(levelConfig(10).crocs).toBe(1);
    expect(levelConfig(11).crocs).toBe(2);
    expect(levelConfig(100).crocs).toBe(10);
  });

  it('gives every crocodile a row of its own in one of the two houses', () => {
    for (const n of LEVELS) {
      const cfg = levelConfig(n);
      expect(cfg.rightTubs + cfg.leftTubs, `level ${n}`).toBe(cfg.crocs);
      expect(cfg.rightTubs, `level ${n}`).toBeLessThanOrEqual(cfg.rows);
      expect(cfg.leftTubs, `level ${n}`).toBeLessThanOrEqual(cfg.rows);
      // the second house only appears once the first one is full
      if (cfg.crocs <= cfg.rows) expect(cfg.leftTubs, `level ${n}`).toBe(0);
    }
  });

  it('never gets easier: boards and crocodile counts only grow', () => {
    for (const n of LEVELS.slice(1)) {
      const a = levelConfig(n - 1);
      const b = levelConfig(n);
      expect(b.crocs).toBeGreaterThanOrEqual(a.crocs);
      expect(b.cols * b.rows).toBeGreaterThanOrEqual(a.cols * a.rows);
      expect(b.decoyChance).toBeGreaterThanOrEqual(a.decoyChance);
    }
  });
});

describe('generateLevel', () => {
  it('builds the board the difficulty curve asks for', () => {
    for (const n of LEVELS) {
      const level = generateLevel(n);
      const cfg = levelConfig(n);
      expect(level.cols).toBe(cfg.cols);
      expect(level.rows).toBe(cfg.rows);
      expect(level.tiles).toHaveLength(cfg.cols * cfg.rows);
      expect(level.tubs).toHaveLength(cfg.crocs);
      expect(level.tubs.filter((t) => t.dir === E)).toHaveLength(cfg.rightTubs);
      expect(level.tubs.filter((t) => t.dir === W)).toHaveLength(cfg.leftTubs);
      expect(new Set(level.tubs.map((t) => `${t.index}:${t.dir}`)).size).toBe(cfg.crocs);
    }
  });

  it('puts the tap above the top row and bathtubs on the outer columns', () => {
    for (const n of LEVELS) {
      const level = generateLevel(n);
      expect(level.source.dir).toBe(N);
      expect(level.source.index).toBeLessThan(level.cols);
      // single house on the right: the tap is over the left half
      if (level.tubs.every((t) => t.dir === E)) expect(level.source.index, `level ${n}`).toBeLessThan(Math.ceil(level.cols / 2));
      for (const tub of level.tubs) {
        expect(tub.index % level.cols, `level ${n}`).toBe(tub.dir === E ? level.cols - 1 : 0);
      }
    }
  });

  it('is solvable: the stored solution waters every crocodile without leaks on the path', () => {
    for (const n of LEVELS) {
      const level = generateLevel(n);
      const tiles = level.tiles.map((t, i) => ({ kind: t.kind, rot: level.solution[i] }));
      const flow = computeFlow({ ...level, tiles });
      expect(flow.solved, `level ${n}`).toBe(true);
      for (const cell of flow.cells) {
        if (level.onPath[cell.index]) expect(cell.leaks, `level ${n} cell ${cell.index}`).toEqual([]);
      }
    }
  });

  it('never starts already solved', () => {
    for (const n of LEVELS) {
      expect(computeFlow(generateLevel(n)).solved, `level ${n}`).toBe(false);
    }
  });

  it('is deterministic', () => {
    for (const n of [1, 5, 19, 57, 100]) {
      expect(generateLevel(n)).toEqual(generateLevel(n));
    }
  });

  it('starts with only two or three wrong pieces on the first levels', () => {
    for (const [n, wrong] of [[1, 2], [2, 3]] as const) {
      const level = generateLevel(n);
      const off = level.tiles.filter((t, i) => level.onPath[i] && t.rot !== level.solution[i]).length;
      expect(off).toBe(wrong);
    }
  });

  it('uses spare pieces only from level 6', () => {
    for (const n of LEVELS.slice(0, 5)) {
      const level = generateLevel(n);
      expect(level.tiles.every((t, i) => level.onPath[i] || t.kind === 'empty')).toBe(true);
    }
    const spare = LEVELS.slice(5, 30).some((n) => {
      const level = generateLevel(n);
      return level.tiles.some((t, i) => !level.onPath[i] && t.kind !== 'empty');
    });
    expect(spare).toBe(true);
  });
});
