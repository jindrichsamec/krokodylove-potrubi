import { MAX_LEVEL, levelConfig } from '../game/levels';
import { crocHeadSvg, tubSvg } from './art';

export type ScreenName = 'title' | 'map' | 'game';

export function showScreen(name: ScreenName): void {
  for (const el of document.querySelectorAll<HTMLElement>('.screen')) {
    el.classList.toggle('is-active', el.id === `screen-${name}`);
  }
}

/** Big happy crocodile in a full bathtub for the title screen. */
export function renderTitleArt(host: HTMLElement): void {
  host.innerHTML = `<svg viewBox="26 12 204 88" aria-hidden="true"><g class="title-tub">${tubSvg('title-tub-clip')}</g></svg>`;
  host.querySelector('.tub')!.classList.add('full', 'happy');
}

const crocIcon = `<svg class="croc-icon happy" viewBox="80 20 100 50" aria-hidden="true">${crocHeadSvg()}</svg>`;

/**
 * Level picker: one row of ten levels per crocodile count.
 * Levels up to `unlocked` can be played, the rest stay locked.
 */
export function renderMap(host: HTMLElement, completed: number, unlocked: number, onPick: (n: number) => void): void {
  const groups = new Map<number, number[]>();
  for (let n = 1; n <= MAX_LEVEL; n++) {
    const crocs = levelConfig(n).crocs;
    groups.set(crocs, [...(groups.get(crocs) ?? []), n]);
  }

  host.innerHTML = [...groups]
    .map(
      ([crocs, levels]) => `
      <section class="map-group">
        <div class="map-crocs" aria-label="Krokodýlů: ${crocs}">${crocIcon}<span>${crocs}</span></div>
        <div class="map-levels">
          ${levels
            .map((n) => {
              const state = n <= completed ? 'is-done' : n === completed + 1 ? 'is-next' : n <= unlocked ? '' : 'is-locked';
              return `<button class="level ${state}" data-level="${n}" ${n > unlocked ? 'disabled' : ''}>${n}</button>`;
            })
            .join('')}
        </div>
      </section>`,
    )
    .join('');

  host.onclick = (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>('[data-level]');
    if (button && !button.disabled) onPick(Number(button.dataset.level));
  };
  host.querySelector('.is-next')?.scrollIntoView({ block: 'center' });
}
