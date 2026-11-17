import { weekdayOf } from '@/entities/event';

/** Today's cell: a faint hatch, as the team calendar marks it. */
export const TODAY_HATCH =
  'bg-[repeating-linear-gradient(135deg,color-mix(in_srgb,var(--event-blue-foreground)_19%,transparent)_0_1px,transparent_1px_6px)]';

/** A weekday's colour: Sunday the day-off red, Saturday blue; weekdays inherit. */
export function weekdayTone(weekday: number) {
  if (weekday === 0) return 'text-day-off';
  if (weekday === 6) return 'text-saturday';
  return undefined;
}

/** The holidays' names by their day. */
export type HolidayNames = ReadonlyMap<string, string>;

/** A day's colour: a holiday reads as a day off whatever its weekday, else its weekday's colour. */
export const dayTone = (day: string, holidays?: HolidayNames) => (holidays?.has(day) ? 'text-day-off' : weekdayTone(weekdayOf(day)));

/** A holiday's name after a day's spoken name: "11월 3일 화요일 개천절". */
export const holidaySuffix = (day: string, holidays?: HolidayNames) => (holidays?.has(day) ? ` ${holidays.get(day)}` : '');

/** A mark's ground (bar, block) in its event's colour, a shade deeper under the pointer. */
export const MARK_FILL = 'bg-(--event-fill) text-(--event-ink) hover:bg-[color-mix(in_srgb,var(--event-fill)_80%,var(--foreground))]';
/** A mark chosen from the keyboard. */
export const MARK_FOCUS = 'outline-none focus-visible:ring-2 focus-visible:ring-ring';
