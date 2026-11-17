import { useState } from 'react';
import { KINDS, type Kind } from './items';

/** client's key and shape ({hidden: [...]}), so what a member turned off there stays off here. */
const KEY = 'cowork-calendar-filters';

function read(): Kind[] {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}') as { hidden?: unknown };
    const hidden = Array.isArray(saved.hidden) ? saved.hidden : [];
    const shown = KINDS.filter(kind => !hidden.includes(kind));
    return shown.length === KINDS.length ? [] : shown;
  } catch {
    return [];
  }
}

/**
 * The kinds the calendar shows, as its one filter (보이기): none chosen shows them all. Kept in this browser for the
 * next visit; a browser that keeps nothing still keeps the choice while the page is open.
 */
export function useShownKinds() {
  const [shown, setShown] = useState<Kind[]>(read);
  const save = (next: Kind[]) => {
    setShown(next);
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, unknown>;
      localStorage.setItem(KEY, JSON.stringify({ ...saved, hidden: next.length === 0 ? [] : KINDS.filter(kind => !next.includes(kind)) }));
    } catch {
      // Storage refused; the choice lasts for this visit.
    }
  };
  return { shown, save };
}
