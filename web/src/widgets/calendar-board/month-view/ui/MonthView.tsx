import { useMemo } from 'react';
import { currentDay, isSameMonth, type CalendarEvent, type Holiday } from '@/entities/event';
import { useIsMobile } from '@/shared/lib/use-mobile';
import type { Source } from '../../model/items';
import type { MarkWrap } from '../../model/mark';
import { DayAgenda } from './DayAgenda';
import { MonthCompact } from './MonthCompact';
import { MonthGrid } from './MonthGrid';

/**
 * A month of events, Sunday first as the team calendar. A desktop draws the full grid (bars across days, timed lines,
 * "+N 더보기"), a day's cell opening that day (onShowDay) and a mark its summary (wrap); a phone a compact grid of numbers
 * and dots with the chosen day's marks listed under it, a day's cell choosing it (onSelect).
 */
export function MonthView({ month, today = currentDay(), events, holidays = [], sources, selected, onSelect, onShowDay, wrap }: {
  /** Any day of the month shown, as 2026-11-03. */
  month: string;
  /** Today, as 2026-11-03; the screen's day when left out. */
  today?: string;
  events: readonly CalendarEvent[];
  holidays?: readonly Holiday[];
  /** What each mark stands for, to say who a phone's list line is. */
  sources?: ReadonlyMap<string, Source>;
  /** The chosen day: a phone lists its marks, a desktop shades it while it is open over the calendar. */
  selected?: string;
  onSelect?: (day: string) => void;
  onShowDay?: (day: string) => void;
  wrap?: MarkWrap;
}) {
  const isPhone = useIsMobile();
  const offs = useMemo(() => new Map(holidays.map(holiday => [holiday.day, holiday.name])), [holidays]);
  if (!isPhone) return <MonthGrid month={month} today={today} events={events} holidays={offs} selected={selected} onDay={day => onShowDay?.(day)} wrap={wrap} />;
  // The chosen day when it is in this month; else today when it is, else the 1st.
  const chosen = selected && isSameMonth(selected, month) ? selected : isSameMonth(today, month) ? today : `${month.slice(0, 8)}01`;
  return <div className="flex flex-1 flex-col">
    <MonthCompact month={month} today={today} events={events} holidays={offs} selected={chosen} onDay={day => onSelect?.(day)} />
    <DayAgenda day={chosen} events={events} holiday={offs.get(chosen)} sources={sources} wrap={wrap} />
  </div>;
}
