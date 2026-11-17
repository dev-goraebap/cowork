import { useEffect, useState, type RefObject } from 'react';

/** How far under the scroll area's top a heading counts as reached, in px: about a heading's own height. */
const LINE = 96;

/**
 * The section being read in a scroll area: the last of the given ids whose heading has passed a line just under the
 * area's top (the first before any has). For a phone's table of contents button, where no Outline tracks it.
 */
export function useActiveSection(scroll: RefObject<HTMLElement | null>, ids: readonly string[]): string | undefined {
  const [active, setActive] = useState(ids[0]);
  const key = ids.join();
  useEffect(() => {
    const area = scroll.current;
    if (!area) return;
    const measure = () => {
      const top = area.getBoundingClientRect().top + LINE;
      let current = ids[0];
      for (const id of ids) {
        const heading = area.querySelector<HTMLElement>(`[id="${id}"]`);
        if (heading && heading.getBoundingClientRect().top <= top) current = id;
      }
      setActive(current);
    };
    measure();
    area.addEventListener('scroll', measure, { passive: true });
    return () => area.removeEventListener('scroll', measure);
    // The ids are read through key, so a new array with the same ids keeps the listener.
  }, [scroll, key]);
  return active;
}
