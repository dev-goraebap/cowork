import { covers, dayOf, isBar, layBars, type CalendarEvent, type PlacedBar } from '@/entities/event';

/** Lines a day holds under its number (bars and timed events together), as the cell of a six-week month has room for. */
export const LINES = 4;

/**
 * A week of the month as its rows: the bars in their lanes, then each day's timed events on the lines left, then a foot
 * with what did not fit. Every kind starts on the same row across the week, so a bar runs on straight.
 */
export type MonthWeek = {
  days: string[];
  bars: PlacedBar[];
  barLanes: number;
  timed: CalendarEvent[][];
  timedLines: number;
  hidden: number[];
  hasFoot: boolean;
};

export const timedOn = (events: readonly CalendarEvent[], day: string) =>
  events.filter(event => !isBar(event) && dayOf(event.start) === day).sort((a, b) => a.start.localeCompare(b.start));

export function layoutWeek(days: string[], events: readonly CalendarEvent[], capacity = LINES): MonthWeek {
  const laid = layBars(events, days);
  const barLanes = Math.min(laid.lanes, capacity);
  const bars = laid.bars.filter(bar => bar.lane < barLanes);
  const all = days.map(day => timedOn(events, day));
  const timedLines = Math.min(Math.max(0, ...all.map(list => list.length)), capacity - barLanes);
  const timed = all.map(list => list.slice(0, timedLines));
  const hidden = days.map((day, index) => laid.bars.filter(bar => bar.lane >= barLanes && covers(bar.event, day)).length
    + all[index].length - timed[index].length);
  return { days, bars, barLanes, timed, timedLines, hidden, hasFoot: hidden.some(count => count > 0) };
}

/** The week's grid rows: the number, the bar lanes, the timed lines, the foot when needed, then the rest of the cell. */
export function weekRows(week: MonthWeek, inlineFoot = false): string {
  const repeat = (count: number, size: string) => (count ? ` repeat(${count}, ${size})` : '');
  return `1.875rem${repeat(week.barLanes, '1.25rem')}${repeat(week.timedLines, '1.3125rem')}${week.hasFoot && !inlineFoot ? ' 1.25rem' : ''} minmax(0, 1fr)`;
}

/** 고정된 주 높이에 들어가는 일정만 표시하고 더보기 공간도 확보한다. */
export function fitWeek(days: string[], events: readonly CalendarEvent[], height: number, rem: number) {
  for (let capacity = LINES; capacity >= 0; capacity--) {
    const week = layoutWeek(days, events, capacity);
    const tracks = week.barLanes + week.timedLines + (week.hasFoot ? 1 : 0);
    const required = (1.875 + week.barLanes * 1.25 + week.timedLines * 1.3125 + (week.hasFoot ? 1.25 : 0) + 0.25) * rem
      + (tracks + 1) * 3 + 1;
    if (required <= height) return { week, inlineFoot: false };
  }
  return { week: layoutWeek(days, events, 0), inlineFoot: true };
}
