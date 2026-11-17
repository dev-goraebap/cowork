import type { CalendarEvent } from './types';

/*
 * Days as 2026-11-03 and minutes as 2026-11-03T10:30, read without a time zone: a calendar's day is the one written,
 * wherever the screen is. Counting is done on UTC midnights, which have no daylight saving to skip a day.
 */
const MS_DAY = 86_400_000;
const utc = (day: string) => Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10)));
const fromUtc = (time: number) => new Date(time).toISOString().slice(0, 10);

/** The weekdays' short names, Sunday first, as cowork's team calendar (client) sets its weeks. */
export const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;

export const dayOf = (moment: string) => moment.slice(0, 10);
export const shiftDay = (day: string, days: number) => fromUtc(utc(day) + days * MS_DAY);
export const daysBetween = (from: string, to: string) => Math.round((utc(to) - utc(from)) / MS_DAY);
/** 0 for Sunday to 6 for Saturday. */
export const weekdayOf = (day: string) => new Date(utc(day)).getUTCDay();
export const weekStartOf = (day: string) => shiftDay(day, -weekdayOf(day));
export const isSameMonth = (a: string, b: string) => a.slice(0, 7) === b.slice(0, 7);

/** The six weeks a month's page shows, Sunday first: the month's days with the days before and after filling the weeks. */
export function monthWeeks(anyDay: string): string[][] {
  const first = weekStartOf(`${anyDay.slice(0, 8)}01`);
  return Array.from({ length: 6 }, (_, week) => Array.from({ length: 7 }, (_, day) => shiftDay(first, week * 7 + day)));
}

/** The seven days of the week holding a day, Sunday first. */
export const weekDays = (anyDay: string) => Array.from({ length: 7 }, (_, index) => shiftDay(weekStartOf(anyDay), index));

/** Minutes since midnight of 2026-11-03T10:30 (630). */
export const minuteOf = (moment: string) => Number(moment.slice(11, 13)) * 60 + Number(moment.slice(14, 16));
export const clock = (moment: string) => moment.slice(11, 16);
/** 11월 3일 */
export const monthDay = (day: string) => `${Number(day.slice(5, 7))}월 ${Number(day.slice(8, 10))}일`;
/** 11월 3일 화요일 */
export const dayTitle = (day: string) => `${monthDay(day)} ${WEEKDAYS[weekdayOf(day)]}요일`;

/** The first and last day an event covers. */
export const spanOf = (event: CalendarEvent) => ({ first: dayOf(event.start), last: dayOf(event.end) });
/** An event over whole days, or one that runs past its first day: drawn as a bar across the days rather than a timed line. */
export const isBar = (event: CalendarEvent) => !!event.isAllDay || dayOf(event.start) !== dayOf(event.end);
export const covers = (event: CalendarEvent, day: string) => spanOf(event).first <= day && day <= spanOf(event).last;

/** 10:30–11:30, or 종일 for one over whole days. */
export const timeRange = (event: CalendarEvent) => (event.isAllDay ? '종일' : `${clock(event.start)}–${clock(event.end)}`);

const pad = (value: number) => String(value).padStart(2, '0');
/** Today on this screen's clock, as 2026-11-03. */
export function currentDay(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
/** This minute on this screen's clock, as 2026-11-03T10:30. */
export function currentMoment(): string {
  const now = new Date();
  return `${currentDay()}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

/** 3 for 2026-11-03. */
export const dayNumber = (day: string) => Number(day.slice(8, 10));
/** 2026년 11월 */
export const monthTitle = (day: string) => `${day.slice(0, 4)}년 ${Number(day.slice(5, 7))}월`;
/** 10:00 as 10시 and 10:30 as it is, as the month's lines say a start: an hour on the dot is the commonest and the cell gains room. */
export const shortClock = (moment: string) => (moment.slice(14, 16) === '00' ? `${Number(moment.slice(11, 13))}시` : clock(moment));
