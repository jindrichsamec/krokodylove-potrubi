import { computeFlow } from '../game/flow';
import { Level } from '../game/generator';
import { DX, DY, Dir, E, Tile, W } from '../game/tiles';
import { EDGE, P, TANK_H, TANK_W, TILE, dropSvg, houseSvg, stubSvg, tankSvg, tileSvg, tubSvg, valveSvg } from './art';

export interface BoardEvents {
  onTurn(): void;
  onValve(): void;
  onWaterStart(): void;
  onWaterStop(): void;
  onTubFilled(): void;
  onWin(): void;
  onTryAgain(): void;
}

// Scene layout, in SVG units (one pipe tile = 100).
const PAD = 16;
const HOUSE = 252; // a house beside the pipe wall
const SIDE = 24; // margin on a side without a house
const TAP = 94; // pipe with the tap wheel between tank and wall
const TOP = TANK_H + TAP;
const GROUND = 14;

const ARM = TILE / 2;
/** Pause before the water drains away after a try that did not reach everyone. */
const LOOK_MS = 1400;
const DRAIN_MS = 800;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Draws a level into `host` and runs the game on it: tap a piece to turn it,
 * tap the wheel to let the water run. Returns a function that removes the board.
 *
 * The tank stands above the pipe wall, the houses with the bathtubs beside it:
 * always one on the right, a second one on the left once the first is full.
 */
export function mountBoard(host: HTMLElement, level: Level, events: BoardEvents): () => void {
  const { cols, rows, source, tubs } = level;
  const tiles: Tile[] = level.tiles.map((t) => ({ ...t }));
  const rowOf = (index: number) => Math.floor(index / cols);
  const rightRows = tubs.filter((t) => t.dir === E).map((t) => rowOf(t.index));
  const leftRows = tubs.filter((t) => t.dir === W).map((t) => rowOf(t.index));

  const gx = PAD + (leftRows.length > 0 ? HOUSE : SIDE);
  const gy = PAD + TOP;
  const gw = cols * TILE;
  const gh = rows * TILE;
  const width = gx + gw + HOUSE + PAD;
  const height = gy + gh + GROUND + PAD;
  const sourceX = gx + (source.index % cols) * TILE + ARM;
  const tankX = clamp(sourceX - TANK_W / 2, gx - 10, gx + gw + 10 - TANK_W);
  const valveY = gy - TAP / 2 + 1;

  const tilesSvg = tiles
    .map((t, i) => {
      const x = gx + (i % cols) * TILE;
      const y = gy + rowOf(i) * TILE;
      const attrs = t.kind === 'empty' ? 'class="tile"' : `class="tile is-pipe" data-i="${i}"`;
      return `<g ${attrs} transform="translate(${x} ${y})"><g class="tile-rot" style="transform:rotate(${t.rot * 90}deg)">${tileSvg(t.kind)}</g></g>`;
    })
    .join('');

  // Rooms are drawn for a house on the right; the left house is the same picture mirrored.
  const roomsSvg = (dir: Dir) =>
    tubs
      .map((tub, i) =>
        tub.dir !== dir
          ? ''
          : `
      <g data-tub="${i}" transform="translate(0 ${rowOf(tub.index) * TILE})">
        ${stubSvg(-10, ARM, 30, ARM, 'w-tub')}
        <rect x="24" y="28" width="8" height="44" rx="3" fill="${P.copperLight}" stroke="${P.copperDark}" stroke-width="2.5"/>
        ${tubSvg(`tub-clip-${i}`)}
      </g>`,
      )
      .join('');
  const rightHouse = `<g transform="translate(${gx + gw} ${gy})">${houseSvg(rows, rightRows, level.n)}${roomsSvg(E)}</g>`;
  const leftHouse =
    leftRows.length === 0
      ? ''
      : `<g transform="translate(${gx} ${gy}) scale(-1 1)">${houseSvg(rows, leftRows, level.n + 2)}${roomsSvg(W)}</g>`;

  host.innerHTML = `
    <svg class="scene" viewBox="0 0 ${width} ${height}" role="img" aria-label="Potrubí k vanám s krokodýly">
      <rect x="-4000" y="${gy + gh + 6}" width="9000" height="4000" fill="${P.grass}"/>
      <path d="M${tankX + 14} ${PAD + TANK_H / 2} V${gy - 10} M${tankX + TANK_W - 14} ${PAD + TANK_H / 2} V${gy - 10}" stroke="${P.ink}" stroke-width="6" stroke-linecap="round"/>
      <rect x="${gx - 10}" y="${gy - 10}" width="${gw + 20}" height="${gh + 20}" rx="20" fill="${P.grout}" stroke="${P.groutEdge}" stroke-width="3.5"/>
      ${stubSvg(sourceX, PAD + TANK_H - 8, sourceX, gy, 'w-source')}
      <g transform="translate(${tankX} ${PAD})">${tankSvg()}</g>
      <g class="valve" transform="translate(${sourceX} ${valveY})">${valveSvg(level.n <= 3)}</g>
      <g class="tiles">${tilesSvg}</g>
      ${leftHouse}
      ${rightHouse}
      <g class="drops"></g>
    </svg>`;

  const svg = host.querySelector<SVGSVGElement>('svg')!;
  const drops = svg.querySelector<SVGGElement>('.drops')!;
  const tileEls = new Map<number, SVGGElement>();
  svg.querySelectorAll<SVGGElement>('[data-i]').forEach((el) => tileEls.set(Number(el.dataset.i), el));

  let locked = false;
  const timers: number[] = [];
  const later = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));

  const fill = (el: SVGElement, delay: number, duration: number) => {
    el.style.transition = `stroke-dashoffset ${duration}ms linear ${delay}ms`;
    el.style.strokeDashoffset = '0';
  };

  function turn(i: number): void {
    tiles[i].rot += 1;
    const inner = tileEls.get(i)!.firstElementChild as SVGGElement;
    inner.style.transform = `rotate(${tiles[i].rot * 90}deg)`;
    events.onTurn();
  }

  function openTap(): void {
    locked = true;
    svg.classList.add('flowing');
    events.onValve();
    events.onWaterStart();

    const flow = computeFlow({ cols, rows, source, tubs, tiles });
    // Long pipes run a little faster so nobody waits too long.
    const step = Math.min(260, Math.max(130, 4200 / (flow.maxDepth + 2)));
    const half = step / 2;
    const base = step; // the piece of pipe between tank and wall fills first

    fill(svg.querySelector<SVGElement>('.w-source')!, 0, base);

    const addDrop = (x: number, y: number, at: number) => {
      drops.insertAdjacentHTML('beforeend', dropSvg(x, y));
      const drop = drops.lastElementChild!;
      later(at, () => drop.classList.add('is-on'));
    };

    if (flow.blockedAtSource) addDrop(sourceX, gy + 14, base);

    for (const cell of flow.cells) {
      const start = base + cell.depth * step;
      const el = tileEls.get(cell.index)!;
      const rot = tiles[cell.index].rot;
      el.querySelectorAll<SVGLineElement>('.w').forEach((line) => {
        const local = Number(line.dataset.arm) as Dir;
        const [ex, ey] = EDGE[local];
        const isEntry = (local + rot) % 4 === cell.entry;
        // Water runs edge -> centre on the way in, centre -> edge on the way out.
        const [x1, y1, x2, y2] = isEntry ? [ex, ey, ARM, ARM] : [ARM, ARM, ex, ey];
        line.setAttribute('x1', String(x1));
        line.setAttribute('y1', String(y1));
        line.setAttribute('x2', String(x2));
        line.setAttribute('y2', String(y2));
        fill(line, isEntry ? start : start + half, half);
      });
      const dot = el.querySelector<SVGElement>('.wdot')!;
      dot.style.transition = `opacity 60ms linear ${start + half - 30}ms`;
      dot.style.opacity = '1';

      const cx = gx + (cell.index % cols) * TILE;
      const cy = gy + rowOf(cell.index) * TILE;
      for (const d of cell.leaks) {
        addDrop(cx + EDGE[d][0] + DX[d] * 6, cy + EDGE[d][1] + DY[d] * 6 + 6, start + step);
      }
    }

    for (const reached of flow.tubs) {
      const at = base + reached.depth * step;
      const group = svg.querySelector<SVGGElement>(`[data-tub="${reached.tub}"]`)!;
      fill(group.querySelector<SVGElement>('.w-tub')!, at, half);
      later(at + half, () => {
        group.querySelector('.tub')!.classList.add('filling');
        events.onTubFilled();
      });
      later(at + half + 1100, () => group.querySelector('.tub')!.classList.add('happy'));
    }

    const end = base + (flow.maxDepth + 1) * step + (flow.tubs.length > 0 ? half + 1900 : 600);
    later(end, () => {
      events.onWaterStop();
      if (flow.solved) {
        svg.classList.add('won');
        events.onWin();
      } else {
        events.onTryAgain();
        later(LOOK_MS, drain);
      }
    });
  }

  function drain(): void {
    svg.classList.add('draining');
    svg.classList.remove('flowing');
    svg.querySelectorAll('.tub').forEach((tub) => tub.classList.remove('filling', 'happy'));
    later(DRAIN_MS, () => {
      svg.querySelectorAll<SVGElement>('.w, .wstub, .wdot').forEach((el) => {
        el.style.transition = 'none';
        el.style.strokeDashoffset = '';
        el.style.opacity = '';
      });
      drops.innerHTML = '';
      svg.classList.remove('draining');
      locked = false;
    });
  }

  svg.addEventListener('pointerdown', (event) => {
    if (locked) return;
    const target = event.target as Element;
    if (target.closest('[data-faucet]')) {
      openTap();
      return;
    }
    const tile = target.closest<SVGGElement>('[data-i]');
    if (tile) turn(Number(tile.dataset.i));
  });

  return () => {
    timers.forEach((id) => window.clearTimeout(id));
    events.onWaterStop();
    host.innerHTML = '';
  };
}
