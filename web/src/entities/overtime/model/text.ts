import type { OvertimeSpan, OvertimeView } from '../api/overtime';

/** Minutes as members read a length of time: 210 is 3시간 30분, 45 is 45분, 120 is 2시간. */
export function durationText(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}분`;
  return rest === 0 ? `${hours}시간` : `${hours}시간 ${rest}분`;
}

/** A day as 9월 17일(목). */
export function overtimeDateText(date: string): string {
  const day = new Date(`${date}T00:00:00Z`);
  const weekday = new Intl.DateTimeFormat('ko-KR', { weekday: 'short', timeZone: 'UTC' }).format(day);
  return `${day.getUTCMonth() + 1}월 ${day.getUTCDate()}일(${weekday})`;
}

/** A span as 21:30 ~ 00:30(다음 날). */
export const spanText = (span: OvertimeSpan) =>
  `${span.start.slice(0, 5)} ~ ${span.end.slice(0, 5)}${span.nextDay ? '(다음 날)' : ''}`;

/** The days a record covers: one day, or the first with how many more, as 9월 17일(목) 외 2일. */
export function overtimeDatesText(overtime: OvertimeView): string {
  const [first] = overtime.days;
  if (!first) return '';
  const more = overtime.days.length - 1;
  return more > 0 ? `${overtimeDateText(first.date)} 외 ${more}일` : overtimeDateText(first.date);
}
