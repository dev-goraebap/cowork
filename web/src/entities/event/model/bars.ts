import { daysBetween, isBar, spanOf } from './dates';
import type { CalendarEvent } from './types';

/** An event over days laid across a run of days (a week): its first column, how many it spans, and the lane it takes. */
export type PlacedBar = {
  event: CalendarEvent;
  column: number;
  span: number;
  lane: number;
  /** It began before the run, or runs on after it: its end there is squared off. */
  fromBefore: boolean;
  toAfter: boolean;
};

/**
 * The bars of the events over whole days that fall in a run of consecutive days, each in the first lane free across all
 * its days: events before leave, then earlier first, then longer, so a long bar keeps to the top.
 */
export function layBars(events: readonly CalendarEvent[], days: readonly string[]): { bars: PlacedBar[]; lanes: number } {
  const from = days[0];
  const to = days[days.length - 1];
  if (!from || !to) return { bars: [], lanes: 0 };
  const shown = events.filter(isBar).filter(event => spanOf(event).first <= to && spanOf(event).last >= from)
    .sort((a, b) => Number(a.kind === 'leave') - Number(b.kind === 'leave')
      || spanOf(a).first.localeCompare(spanOf(b).first)
      || daysBetween(spanOf(b).first, spanOf(b).last) - daysBetween(spanOf(a).first, spanOf(a).last));
  const taken: boolean[][] = [];
  const bars = shown.map(event => {
    const { first, last } = spanOf(event);
    const column = Math.max(0, daysBetween(from, first));
    const end = Math.min(days.length - 1, daysBetween(from, last));
    let lane = 0;
    while (taken[lane]?.slice(column, end + 1).some(Boolean)) lane += 1;
    taken[lane] ??= [];
    for (let index = column; index <= end; index += 1) taken[lane][index] = true;
    return { event, column, span: end - column + 1, lane, fromBefore: first < from, toAfter: last > to };
  });
  return { bars, lanes: taken.length };
}
