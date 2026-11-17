import { cn } from 'cn';
import { covers, dayNumber, dayTitle, EventDot, isSameMonth, monthTitle, monthWeeks, WEEKDAYS, type CalendarEvent } from '@/entities/event';
import { dayTone, holidaySuffix, TODAY_HATCH, weekdayTone, type HolidayNames } from '../../ui/day-style';

/** Dots a phone's day shows under its number; more events than this still show three. */
const DOTS = 3;

/**
 * The month on a phone: the same six weeks, each day only its number and up to three dots in its events' colours, the
 * chosen day shaded. A holiday's number reads as a day off; its name heads the list below (DayAgenda).
 */
export function MonthCompact({ month, today, events, holidays, selected, onDay }: {
  month: string; today: string; events: readonly CalendarEvent[]; holidays: HolidayNames; selected: string; onDay: (day: string) => void;
}) {
  return <section aria-label={monthTitle(month)} className="shrink-0 border-b bg-background">
    <ol aria-hidden className="grid grid-cols-7 border-b px-2">
      {WEEKDAYS.map((name, index) => <li key={name} className={cn('py-2 text-center text-xs font-semibold', weekdayTone(index) ?? 'text-muted-foreground')}>{name}</li>)}
    </ol>
    <ol className="grid grid-cols-7 px-2 pt-1 pb-2">
      {monthWeeks(month).flat().map(day => {
        const on = events.filter(event => covers(event, day));
        const isSelected = day === selected;
        const isOutside = !isSameMonth(day, month);
        return <li key={day} className="contents">
          <button type="button" aria-pressed={isSelected} aria-current={day === today ? 'date' : undefined}
            aria-label={`${dayTitle(day)}${holidaySuffix(day, holidays)}, 일정 ${on.length}개`} onClick={() => onDay(day)}
            className={cn(
              'flex h-12 min-w-0 flex-col items-center gap-[3px] rounded-lg pt-1 outline-none focus-visible:ring-2 focus-visible:ring-ring',
              dayTone(day, holidays), day === today && TODAY_HATCH, isSelected && 'bg-pressed',
            )}>
            <time dateTime={day} className={cn('text-sm font-semibold tabular-nums', isOutside && 'opacity-40')}>{dayNumber(day)}</time>
            <span className={cn('flex h-[0.4375rem] items-center gap-0.5', isOutside && 'opacity-40')}>
              {on.slice(0, DOTS).map(event => <EventDot key={event.id} color={event.color} />)}
            </span>
          </button>
        </li>;
      })}
    </ol>
  </section>;
}
