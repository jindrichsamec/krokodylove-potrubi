import { MAX_LEVEL } from './game/levels';

const KEY = 'krokodylove-potrubi';

export interface Save {
  /** Highest finished level; 0 = nothing finished yet. */
  completed: number;
  muted: boolean;
}

export function loadSave(): Save {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    return {
      completed: Number.isInteger(raw.completed) && raw.completed > 0 ? Math.min(raw.completed, MAX_LEVEL) : 0,
      muted: raw.muted === true,
    };
  } catch {
    return { completed: 0, muted: false };
  }
}

export function storeSave(save: Save): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    // Private browsing: the game still works, progress just is not kept.
  }
}
