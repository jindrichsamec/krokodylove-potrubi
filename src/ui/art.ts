import { BASE_MASK, DIRS, Dir, TileKind, bit } from '../game/tiles';

/** Colours of everything drawn inside the game scene. */
export const P = {
  ink: '#244B55',
  tile: '#F8FCFA',
  tileEmpty: '#E4F1EC',
  grout: '#B5D6CC',
  groutEdge: '#8DBDB0',
  copper: '#E2A172',
  copperDark: '#8A5436',
  copperLight: '#F4CBA6',
  water: '#43A5DC',
  waterLight: '#A9DAF2',
  glass: '#E6F4F3',
  croc: '#7BB062',
  crocDark: '#4C7F43',
  valve: '#E56552',
  valveDark: '#A23E31',
  duck: '#F6C64A',
  wall: '#F6DFC2',
  roof: '#D9866A',
  roofDark: '#A85C45',
  grass: '#A8D19A',
  enamel: '#FFFFFF',
  blush: '#F3A493',
};

export const TILE = 100;
/** Pipe widths: dark outline, copper body, visible water. */
const OUTLINE_W = 34;
const BODY_W = 26;
export const WATER_W = 14;

/** Where each arm of a piece meets the tile edge (tile-local coordinates). */
export const EDGE: readonly (readonly [number, number])[] = [
  [50, 0],
  [100, 50],
  [50, 100],
  [0, 50],
];

const FLANGE: readonly string[] = [
  'x="28" y="0" width="44" height="8"',
  'x="92" y="28" width="8" height="44"',
  'x="28" y="92" width="44" height="8"',
  'x="0" y="28" width="8" height="44"',
];

/** One pipe piece at rotation 0, drawn in a 100x100 box. */
export function tileSvg(kind: TileKind): string {
  if (kind === 'empty') {
    return `<rect x="3" y="3" width="94" height="94" rx="12" fill="${P.tileEmpty}"/>`;
  }
  const arms = DIRS.filter((d) => (BASE_MASK[kind] & bit(d)) !== 0);
  const joint = arms.length > 2;
  const arm = (d: Dir, colour: string, width: number) =>
    `<line x1="50" y1="50" x2="${EDGE[d][0]}" y2="${EDGE[d][1]}" stroke="${colour}" stroke-width="${width}"/>`;

  return `
    <rect width="100" height="100" fill="none"/>
    <rect x="3" y="3" width="94" height="94" rx="12" fill="${P.tile}"/>
    ${arms.map((d) => arm(d, P.copperDark, OUTLINE_W)).join('')}
    <circle cx="50" cy="50" r="${joint ? 21 : OUTLINE_W / 2}" fill="${P.copperDark}"/>
    ${arms.map((d) => arm(d, P.copper, BODY_W)).join('')}
    <circle cx="50" cy="50" r="${joint ? 17 : BODY_W / 2}" fill="${P.copper}"/>
    ${arms.map((d) => `<rect ${FLANGE[d]} rx="3" fill="${P.copperLight}" stroke="${P.copperDark}" stroke-width="2.5"/>`).join('')}
    <g class="water">
      ${arms.map((d) => `<line class="w" data-arm="${d}" stroke="${P.water}" stroke-width="${WATER_W}"/>`).join('')}
      <circle class="wdot" cx="50" cy="50" r="${WATER_W / 2}" fill="${P.water}"/>
    </g>`;
}

/** A straight piece of fixed pipe from (x1,y1) to (x2,y2) with a water channel that fills in that direction. */
export function stubSvg(x1: number, y1: number, x2: number, y2: number, cls: string): string {
  const d = `M${x1} ${y1}L${x2} ${y2}`;
  return `
    <path d="${d}" fill="none" stroke="${P.copperDark}" stroke-width="${OUTLINE_W}"/>
    <path d="${d}" fill="none" stroke="${P.copper}" stroke-width="${BODY_W}"/>
    <g class="water"><path class="wstub ${cls}" pathLength="1" d="${d}" fill="none" stroke="${P.water}" stroke-width="${WATER_W}"/></g>`;
}

/** Crocodile head with both faces; an ancestor with class `happy` switches to the happy one. */
export function crocHeadSvg(): string {
  return `
      <g class="croc-head">
        <circle cx="165" cy="36" r="8" fill="${P.croc}" stroke="${P.crocDark}" stroke-width="2.5"/>
        <path d="M86 53 Q86 44 96 44 L128 44 Q133 30 151 30 Q174 30 174 52 L174 84 L124 84 L124 62 L96 62 Q86 62 86 53 Z"
          fill="${P.croc}" stroke="${P.crocDark}" stroke-width="2.5" stroke-linejoin="round"/>
        <circle cx="146" cy="33" r="9.5" fill="${P.croc}" stroke="${P.crocDark}" stroke-width="2.5"/>
        <g class="face-waiting">
          <circle cx="146" cy="33" r="5.6" fill="#fff"/>
          <circle cx="144" cy="33.6" r="2.9" fill="${P.ink}"/>
          <circle cx="165" cy="36" r="4.4" fill="#fff"/>
          <circle cx="163.6" cy="36.5" r="2.3" fill="${P.ink}"/>
          <path d="M90 56 L122 56" fill="none" stroke="${P.crocDark}" stroke-width="2.5" stroke-linecap="round"/>
        </g>
        <g class="face-happy">
          <path d="M141 35 Q146 28 151 35" fill="none" stroke="${P.ink}" stroke-width="2.6" stroke-linecap="round"/>
          <path d="M161 38 Q165 32.5 169 38" fill="none" stroke="${P.ink}" stroke-width="2.4" stroke-linecap="round"/>
          <path d="M90 54 Q108 63 125 53" fill="none" stroke="${P.crocDark}" stroke-width="2.5" stroke-linecap="round"/>
          <circle cx="131" cy="53" r="4.6" fill="${P.blush}" opacity="0.7"/>
        </g>
        <circle cx="92" cy="49" r="1.8" fill="${P.crocDark}"/>
      </g>`;
}

const TUB_INSIDE = 'M44 68 L44 76 Q44 90 60 90 L196 90 Q212 90 212 76 L212 68 Z';

/**
 * A crocodile sitting in a bathtub, in a 236x100 room box whose left edge is the
 * pipe wall. Add class `filling` to pour water in, `happy` for the happy face.
 */
export function tubSvg(id: string): string {
  return `
    <g class="tub">
      <path class="stream" d="M30 50 Q50 50 54 76" fill="none" stroke="${P.water}" stroke-width="8" stroke-linecap="round"/>
      <path d="M202 70 C216 60 218 44 208 36" fill="none" stroke="${P.crocDark}" stroke-width="12" stroke-linecap="round"/>
      <path d="M202 70 C216 60 218 44 208 36" fill="none" stroke="${P.croc}" stroke-width="7.5" stroke-linecap="round"/>
      <path d="${TUB_INSIDE}" fill="${P.enamel}"/>
      <clipPath id="${id}"><path d="${TUB_INSIDE}"/></clipPath>
      <g clip-path="url(#${id})">
        <ellipse cx="142" cy="88" rx="56" ry="13" fill="${P.croc}" stroke="${P.crocDark}" stroke-width="2.5"/>
      </g>
      ${crocHeadSvg()}
      <g clip-path="url(#${id})">
        <rect class="tub-water" x="40" y="71" width="176" height="24" fill="${P.water}" opacity="0.78"/>
      </g>
      <path d="M44 68 L44 76 Q44 90 60 90 L196 90 Q212 90 212 76 L212 68" fill="none" stroke="${P.ink}" stroke-width="4" stroke-linejoin="round"/>
      <rect x="36" y="63" width="184" height="9" rx="4.5" fill="${P.enamel}" stroke="${P.ink}" stroke-width="3"/>
      <path d="M60 91 v5 M196 91 v5" stroke="${P.ink}" stroke-width="5" stroke-linecap="round"/>
      <g class="bubbles" fill="#fff" stroke="${P.waterLight}" stroke-width="1.5">
        <circle cx="62" cy="58" r="4"/>
        <circle cx="74" cy="56" r="2.8"/>
        <circle cx="190" cy="58" r="3.4"/>
      </g>
    </g>`;
}

const WALLPAPER = ['#FBEEDB', '#E7F2E6', '#F8E4DE', '#E6EEF6', '#F6EDCB'];

const DECOR: readonly string[] = [
  // window
  `<rect x="88" y="20" width="64" height="52" rx="8" fill="#D3ECF4" stroke="${P.ink}" stroke-width="3"/>
   <path d="M120 20 V72 M88 46 H152" stroke="${P.ink}" stroke-width="3"/>
   <rect x="82" y="72" width="76" height="7" rx="3.5" fill="${P.enamel}" stroke="${P.ink}" stroke-width="3"/>`,
  // plant
  `<path d="M120 70 C120 50 104 44 98 30 M120 70 C120 48 136 42 142 26 M120 70 V30" fill="none" stroke="${P.crocDark}" stroke-width="3" stroke-linecap="round"/>
   <ellipse cx="98" cy="32" rx="8" ry="12" transform="rotate(-28 98 32)" fill="${P.croc}"/>
   <ellipse cx="142" cy="29" rx="8" ry="12" transform="rotate(28 142 29)" fill="${P.croc}"/>
   <ellipse cx="120" cy="28" rx="8" ry="13" fill="${P.croc}"/>
   <path d="M102 68 H138 L133 94 H107 Z" fill="${P.roof}" stroke="${P.ink}" stroke-width="3" stroke-linejoin="round"/>`,
  // rubber duck on a shelf
  `<rect x="78" y="62" width="88" height="8" rx="4" fill="${P.enamel}" stroke="${P.ink}" stroke-width="3"/>
   <path d="M104 61 C96 61 94 50 104 48 C100 36 122 34 122 46 L134 44 C136 54 130 61 122 61 Z" fill="${P.duck}" stroke="${P.ink}" stroke-width="3" stroke-linejoin="round"/>
   <circle cx="110" cy="43" r="2" fill="${P.ink}"/>
   <path d="M100 46 l-7 2 l7 3" fill="${P.valve}" stroke="${P.ink}" stroke-width="2" stroke-linejoin="round"/>`,
  // towel on a rail
  `<path d="M84 28 H156" stroke="${P.ink}" stroke-width="4" stroke-linecap="round"/>
   <rect x="98" y="26" width="44" height="50" rx="5" fill="${P.waterLight}" stroke="${P.ink}" stroke-width="3"/>
   <path d="M98 62 H142 M98 68 H142" stroke="${P.enamel}" stroke-width="3"/>`,
];

/** The house to the right of the pipe wall: one room per board row. */
export function houseSvg(rows: number, tubRows: number[], seed: number): string {
  const h = rows * TILE;
  const rooms = Array.from({ length: rows }, (_, r) => {
    const tub = tubRows.includes(r);
    return `
      <g transform="translate(0 ${r * TILE})">
        <rect x="20" y="5" width="208" height="90" rx="9" fill="${WALLPAPER[(r + seed) % WALLPAPER.length]}"/>
        ${tub ? '' : DECOR[(r * 3 + seed) % DECOR.length]}
      </g>`;
  }).join('');
  return `
    <path d="M-2 -8 L124 -62 L250 -8 Z" fill="${P.roof}" stroke="${P.ink}" stroke-width="3.5" stroke-linejoin="round"/>
    <rect x="182" y="-52" width="22" height="30" rx="3" fill="${P.roofDark}" stroke="${P.ink}" stroke-width="3.5"/>
    <rect x="12" y="-8" width="224" height="${h + 12}" rx="6" fill="${P.wall}" stroke="${P.ink}" stroke-width="3.5"/>
    ${rooms}`;
}

export const TANK_W = 220;
export const TANK_H = 72;

/** The water tank that stands above the pipe wall, drawn in a TANK_W x TANK_H box. */
export function tankSvg(): string {
  const w = TANK_W;
  const h = TANK_H;
  const body = `x="3" y="3" width="${w - 6}" height="${h - 6}" rx="${(h - 6) / 2}"`;
  const waves = 't30 0 '.repeat(Math.ceil((w + 120) / 30));
  const fishY = Math.round(h * 0.64);
  return `
    <clipPath id="tank-clip"><rect ${body}/></clipPath>
    <rect ${body} fill="${P.glass}"/>
    <g clip-path="url(#tank-clip)">
      <g class="tank-water">
        <path class="tank-wave" d="M-90 22 q15 -6 30 0 ${waves}V${h + 30} H-90 Z" fill="${P.water}" opacity="0.85"/>
        <g class="fish" transform="translate(${Math.round(w * 0.66)} ${fishY})">
          <g class="fish-body">
            <path d="M0 0 C8 -8 20 -8 27 0 C20 8 8 8 0 0 Z M27 0 L36 -7 V7 Z" fill="${P.duck}" stroke="${P.ink}" stroke-width="2.5" stroke-linejoin="round"/>
            <circle cx="8" cy="-2" r="1.7" fill="${P.ink}"/>
          </g>
        </g>
      </g>
    </g>
    <rect ${body} fill="none" stroke="${P.ink}" stroke-width="4"/>
    <path d="M34 15 H84" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity="0.7"/>
    <rect x="${w / 2 - 20}" y="-5" width="40" height="12" rx="6" fill="${P.copper}" stroke="${P.ink}" stroke-width="3.5"/>`;
}

/** The tap wheel, centred on (0,0). */
export function valveSvg(hint: boolean): string {
  const spokes = [45, 135]
    .map((a) => `<line x1="-27" y1="0" x2="27" y2="0" transform="rotate(${a})" stroke="${P.valve}" stroke-width="7"/>`)
    .join('');
  return `
    ${hint ? `<circle class="hint-ring" r="47" fill="none" stroke="${P.duck}" stroke-width="7"/>` : ''}
    <g class="valve-wheel">
      <circle r="29" fill="none" stroke="${P.valveDark}" stroke-width="15"/>
      <circle r="29" fill="none" stroke="${P.valve}" stroke-width="9.5"/>
      ${spokes}
      <circle r="10" fill="${P.valveDark}"/>
      <circle r="5" fill="${P.copperLight}"/>
    </g>
    <circle data-faucet r="58" fill="transparent"/>`;
}

/** A water drop marking a place where water runs out of the pipe. */
export const dropSvg = (x: number, y: number): string =>
  `<path class="drop" transform="translate(${x} ${y})" d="M0 -11 C6 -3 8 1 8 5 a8 8 0 0 1 -16 0 C-8 1 -6 -3 0 -11 Z" fill="${P.water}" stroke="#fff" stroke-width="2.5"/>`;
