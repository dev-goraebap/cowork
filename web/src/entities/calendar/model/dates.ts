/*
 * The calendar's days (2026-11-03) and moments (2026-11-03T10:30:00) as the server writes them, in Seoul's wall clock.
 * Counting is done on UTC midnights, which have no daylight saving to skip a day.
 */
const pad = (value: number) => String(value).padStart(2, '0');
const iso = (date: Date) => `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;

const WEEKDAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'] as const;

/** Today in Seoul, as 2026-09-30. */
export const seoulDay = (now = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(now);

/** The minutes since midnight now in Seoul. */
export function seoulMinute(now = new Date()): number {
  const [hours, minutes] = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .format(now).split(':').map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

/** The day so many days later, or earlier when negative. */
export function addDays(day: string, by: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + by);
  return iso(date);
}

/** The same day so many months later, kept within the month (31 March less a month is 28 February). */
export function addMonths(day: string, by: number): string {
  const date = new Date(`${day.slice(0, 7)}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + by);
  const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(Number(day.slice(8)), last));
  return iso(date);
}

const weekday = (day: string) => new Date(`${day}T00:00:00Z`).getUTCDay();
/** 11월 3일 화요일 */
export const longDay = (day: string) => `${Number(day.slice(5, 7))}월 ${Number(day.slice(8))}일 ${WEEKDAY_NAMES[weekday(day)]}요일`;
/** 11/3 */
export const shortDay = (day: string) => `${Number(day.slice(5, 7))}/${Number(day.slice(8))}`;
/** 14:00 from 2026-10-07T14:00:00 or 14:00:00. */
export const hourMinute = (value?: string | null) => (value ? (value.length > 8 ? value.slice(11, 16) : value.slice(0, 5)) : '');
/** 150 minutes as 2시간 30분. */
export function duration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours === 0 ? `${rest}분` : rest === 0 ? `${hours}시간` : `${hours}시간 ${rest}분`;
}
/** How many days from the first to the last, both counted. */
export const daysCounted = (first: string, last: string) =>
  Math.round((Date.parse(`${last}T00:00:00Z`) - Date.parse(`${first}T00:00:00Z`)) / 86_400_000) + 1;

/** 2026년 11월 */
export const monthTitle = (day: string) => `${day.slice(0, 4)}년 ${Number(day.slice(5, 7))}월`;
/** A week as 9월 27일 – 10월 3일, the second month left out when it is the same. */
export function weekTitle(first: string, last: string): string {
  const end = first.slice(5, 7) === last.slice(5, 7) ? `${Number(last.slice(8))}일` : `${Number(last.slice(5, 7))}월 ${Number(last.slice(8))}일`;
  return `${Number(first.slice(5, 7))}월 ${Number(first.slice(8))}일 – ${end}`;
}

/**
 * The start and end an event is saved with, from the days and times a form holds. An all-day event ends at the midnight
 * after its last day, as the server reads it back.
 */
export const savedSpan = (allDay: boolean, startDate: string, startTime: string, endDate: string, endTime: string) => (allDay
  ? { start: `${startDate}T00:00:00`, end: `${addDays(endDate, 1)}T00:00:00` }
  : { start: `${startDate}T${startTime}:00`, end: `${endDate}T${endTime}:00` });

/** The day an event ends on: an end at midnight belongs to the day before. */
export const lastDayOf = (event: { start: string; end: string }) => {
  const day = event.end.slice(0, 10);
  return event.end.slice(11, 16) === '00:00' && day > event.start.slice(0, 10) ? addDays(day, -1) : day;
};
/** 10월 21일 (수), for each end of something over several days. */
const endDay = (day: string) => `${Number(day.slice(5, 7))}월 ${Number(day.slice(8))}일 (${WEEKDAY_NAMES[weekday(day)]})`;

/**
 * 10월 7일 수요일 14:00 – 14:30 within a day, or 10월 7일 수요일 종일. Over several days both ends read alike:
 * 10월 21일 (수) – 10월 23일 (금) 종일 · 3일, or 10월 21일 (수) 22:00 – 10월 22일 (목) 02:00.
 */
export function whenText(event: { start: string; end: string; allDay: boolean }): string {
  const first = event.start.slice(0, 10);
  const last = lastDayOf(event);
  if (event.allDay) return first === last ? `${longDay(first)} 종일` : `${endDay(first)} – ${endDay(last)} 종일 · ${daysCounted(first, last)}일`;
  if (first === last) return `${longDay(first)} ${hourMinute(event.start)} – ${hourMinute(event.end)}`;
  return `${endDay(first)} ${hourMinute(event.start)} – ${endDay(last)} ${hourMinute(event.end)}`;
}

/** 2026년 11월 3일 14:05, for when an approval step happened. */
export function momentText(value?: string | null): string {
  if (!value) return '';
  return new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    .format(new Date(value));
}
