/** How each state of a week's report reads, the same on every screen, and its token's colour. */
export const REPORT_STATE: Record<string, { label: string; color: 'gray' | 'blue' | 'green' }> = {
  NONE: { label: '작성 전', color: 'gray' },
  DRAFT: { label: '작성 중', color: 'blue' },
  SUBMITTED: { label: '제출', color: 'green' },
  CONFIRMED: { label: '확인', color: 'green' },
};
export const stateOf = (state: string) => REPORT_STATE[state] ?? { label: state, color: 'gray' as const };

/** Whether the report of the state is in, so its page opens. */
export const isSubmitted = (state: string) => state === 'SUBMITTED' || state === 'CONFIRMED';

const zone = { timeZone: 'Asia/Seoul' } as const;
const dayFormat = new Intl.DateTimeFormat('ko-KR', { ...zone, month: 'long', day: 'numeric' });
const weekdayFormat = new Intl.DateTimeFormat('ko-KR', { ...zone, month: 'long', day: 'numeric', weekday: 'short' });
const timeFormat = new Intl.DateTimeFormat('ko-KR', { ...zone, hour: '2-digit', minute: '2-digit', hour12: false });
const momentFormat = new Intl.DateTimeFormat('ko-KR', { ...zone, month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
const isoFormat = new Intl.DateTimeFormat('sv-SE', zone);

/** A Seoul date (2026-10-12) as the noon of that day, so formatting in Seoul never slips a day. */
const noonOf = (date: string) => new Date(`${date}T12:00:00+09:00`);

/** The week by its Monday and Sunday: 10월 12일 ~ 10월 18일. */
export function weekText(weekStart: string): string {
  const sunday = noonOf(weekStart);
  sunday.setDate(sunday.getDate() + 6);
  return `${dayFormat.format(noonOf(weekStart))} ~ ${dayFormat.format(sunday)}`;
}

/** The week's deadline as people say it: 10월 16일 (금) 18:00까지. */
export const dueText = (due: { day: string; at: string }) => `${weekdayFormat.format(noonOf(due.day))} ${timeFormat.format(new Date(due.at))}까지`;

export const momentText = (at: string) => momentFormat.format(new Date(at));

/** A Seoul date as a short day: 10월 14일. */
export const dayText = (date: string) => dayFormat.format(noonOf(date));

/** The Monday before or after the week. */
export function shiftWeek(weekStart: string, weeks: number): string {
  const day = noonOf(weekStart);
  day.setDate(day.getDate() + weeks * 7);
  return isoFormat.format(day);
}

/** The Monday of the week a Seoul date (2026-10-15) falls in: 2026-10-12. */
export function mondayOf(date: string): string {
  const day = noonOf(date);
  day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
  return isoFormat.format(day);
}

/** The Monday of this week in Seoul. */
export const thisMonday = (now: Date = new Date()) => mondayOf(isoFormat.format(now));

/** Whether a value is a date (YYYY-MM-DD), as a week's address holds it. */
export const isDay = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
