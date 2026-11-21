import './style.css';
import { initAudio, setMuted } from './audio/context';
import { startMusic } from './audio/music';
import * as sfx from './audio/sfx';
import { generateLevel } from './game/generator';
import { MAX_LEVEL } from './game/levels';
import { loadSave, storeSave } from './storage';
import { mountBoard } from './ui/board';
import { renderMap, renderTitleArt, showScreen } from './ui/screens';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const save = loadSave();
const stage = $('stage');
const nextButton = $('btn-next');
/** Opening the game with ?vse in the address unlocks every level (for grown-ups). */
const unlockAll = new URLSearchParams(location.search).has('vse');
let current = 1;
let unmountBoard: (() => void) | null = null;

function applyMuted(): void {
  document.documentElement.classList.toggle('is-muted', save.muted);
  setMuted(save.muted);
}

/** Shows the "next level" arrow in place of the level number. */
function setWon(won: boolean): void {
  $('screen-game').classList.toggle('is-won', won);
  nextButton.tabIndex = won ? 0 : -1;
}

function startLevel(n: number): void {
  current = n;
  unmountBoard?.();
  setWon(false);
  $('level-badge').textContent = String(n);
  // After the last level the arrow turns into the way back to the level picker.
  nextButton.classList.toggle('is-last', n >= MAX_LEVEL);
  nextButton.setAttribute('aria-label', n >= MAX_LEVEL ? 'Vybrat úroveň' : 'Další úroveň');

  unmountBoard = mountBoard(stage, generateLevel(n), {
    onTurn: sfx.turn,
    onValve: sfx.valve,
    onWaterStart: sfx.startWater,
    onWaterStop: sfx.stopWater,
    onTubFilled: sfx.splash,
    onTryAgain: sfx.tryAgain,
    onWin: () => {
      sfx.win();
      // Only the next level in line counts, so jumping ahead with ?vse does not skip progress.
      if (n === save.completed + 1) {
        save.completed = n;
        storeSave(save);
      }
      setWon(true);
    },
  });
  showScreen('game');
}

function openMap(): void {
  const unlocked = unlockAll ? MAX_LEVEL : Math.min(MAX_LEVEL, save.completed + 1);
  renderMap($('map-list'), save.completed, unlocked, (n) => {
    sfx.tap();
    startLevel(n);
  });
  showScreen('map');
}

$('btn-play').addEventListener('click', () => {
  sfx.tap();
  startLevel(Math.min(MAX_LEVEL, save.completed + 1));
});
$('btn-levels').addEventListener('click', () => {
  sfx.tap();
  openMap();
});
$('btn-to-map').addEventListener('click', () => {
  sfx.tap();
  openMap();
});
$('btn-map-back').addEventListener('click', () => {
  sfx.tap();
  showScreen('title');
});
nextButton.addEventListener('click', () => {
  sfx.tap();
  if (current >= MAX_LEVEL) {
    openMap();
    return;
  }
  // Fade the old board out before the next one appears.
  stage.classList.add('is-swapping');
  window.setTimeout(() => {
    startLevel(current + 1);
    stage.classList.remove('is-swapping');
  }, 320);
});

for (const button of document.querySelectorAll('.js-sound')) {
  button.addEventListener('click', () => {
    save.muted = !save.muted;
    storeSave(save);
    applyMuted();
    sfx.tap();
  });
}

// Keep Safari from zooming, selecting or opening menus while small fingers play.
for (const type of ['gesturestart', 'dblclick', 'contextmenu']) {
  document.addEventListener(type, (event) => event.preventDefault());
}

// The built game installs a service worker that keeps it playable offline.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  void navigator.serviceWorker.register('./sw.js');
}

initAudio(save.muted);
applyMuted();
startMusic();
renderTitleArt($('title-art'));
