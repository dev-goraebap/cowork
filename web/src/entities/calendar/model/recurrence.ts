import type { EventScope, Recurrence, Weekday } from '../api/calendar';
import { addDays, daysCounted } from './dates';

const NAMES = ['일', '월', '화', '수', '목', '금', '토'] as const;
/** Sunday first, as the calendar draws weeks. */
export const WEEKDAY_ORDER: readonly Weekday[] = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
export const weekdayName = (weekday: Weekday) => NAMES[WEEKDAY_ORDER.indexOf(weekday)] ?? '';
export const weekdayOfDay = (day: string): Weekday => WEEKDAY_ORDER[new Date(`${day}T00:00:00Z`).getUTCDay()] ?? 'SUNDAY';

const ORDINALS = ['첫째', '둘째', '셋째', '넷째'];
/** Which of its weekday in the month the day is, as the server counts: the fifth is the last. */
const ordinalOf = (day: string) => {
  const nth = Math.floor((Number(day.slice(8)) - 1) / 7);
  return nth >= 4 ? '마지막' : ORDINALS[nth];
};
const monthDay = (day: string) => `${Number(day.slice(5, 7))}월 ${Number(day.slice(8))}일`;

/** Monday to Friday, the working week a weekday rule repeats on. */
const WORKWEEK: readonly Weekday[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
const isWorkweek = (weekdays: readonly Weekday[]) => weekdays.length === WORKWEEK.length && WORKWEEK.every(weekday => weekdays.includes(weekday));
/** The most a rule may skip between occurrences, as the server allows. */
export const INTERVAL_MAX = 99;

/**
 * The choices the repeat menu offers, worded for the event's first day. 평일 is offered from a weekday, since the first
 * day is always an occurrence. How many days, weeks, months or years apart is set beside the menu.
 */
export type RepeatChoice = 'NONE' | 'DAILY' | 'WEEKLY' | 'WEEKDAYS' | 'BIWEEKLY' | 'MONTHLY_DAY' | 'MONTHLY_WEEKDAY' | 'YEARLY';

export function repeatChoices(day: string): { value: RepeatChoice; label: string }[] {
  const weekday = weekdayName(weekdayOfDay(day));
  const choices: { value: RepeatChoice; label: string }[] = [
    { value: 'NONE', label: '반복 안 함' },
    { value: 'DAILY', label: '매일' },
    { value: 'WEEKLY', label: '매주' },
    { value: 'WEEKDAYS', label: '평일마다(월–금)' },
    { value: 'BIWEEKLY', label: '2주마다' },
    { value: 'MONTHLY_DAY', label: `매월 ${Number(day.slice(8))}일` },
    { value: 'MONTHLY_WEEKDAY', label: `매월 ${ordinalOf(day)} ${weekday}요일` },
    { value: 'YEARLY', label: `매년 ${monthDay(day)}` },
  ];
  return WORKWEEK.includes(weekdayOfDay(day)) ? choices : choices.filter(choice => choice.value !== 'WEEKDAYS');
}

/** The menu's choice for a rule; one further apart shows its frequency, with the gap beside it. */
export function choiceOf(rule: Recurrence | null): RepeatChoice {
  if (!rule) return 'NONE';
  if (rule.frequency === 'DAILY') return 'DAILY';
  if (rule.frequency === 'WEEKLY') return rule.interval === 2 ? 'BIWEEKLY' : rule.interval === 1 && isWorkweek(rule.weekdays) ? 'WEEKDAYS' : 'WEEKLY';
  if (rule.frequency === 'MONTHLY') return rule.monthlyBy === 'WEEKDAY_OF_MONTH' ? 'MONTHLY_WEEKDAY' : 'MONTHLY_DAY';
  return 'YEARLY';
}

/** The unit the gap between occurrences counts in, as 매 [3] 주마다 reads. */
export const intervalUnit = (rule: Recurrence) =>
  rule.frequency === 'DAILY' ? '일' : rule.frequency === 'WEEKLY' ? '주' : rule.frequency === 'MONTHLY' ? '개월' : '년';

/** The rule a choice makes, keeping how it ends; a weekly one repeats on the first day's weekday. */
export function ruleOf(choice: RepeatChoice, day: string, before: Recurrence | null): Recurrence | null {
  const end = { count: before?.count, until: before?.until };
  const weekdays = [weekdayOfDay(day)];
  switch (choice) {
    case 'NONE': return null;
    case 'WEEKDAYS': return { frequency: 'WEEKLY', interval: 1, weekdays: [...WORKWEEK], ...end };
    case 'DAILY': return { frequency: 'DAILY', interval: 1, weekdays: [], ...end };
    // 매주 after 평일 goes back to the first day's weekday, or it would stay 평일.
    case 'WEEKLY': return { frequency: 'WEEKLY', interval: 1, weekdays: before?.frequency === 'WEEKLY' && !isWorkweek(before.weekdays) ? before.weekdays : weekdays, ...end };
    case 'BIWEEKLY': return { frequency: 'WEEKLY', interval: 2, weekdays: before?.frequency === 'WEEKLY' ? before.weekdays : weekdays, ...end };
    case 'MONTHLY_DAY': return { frequency: 'MONTHLY', interval: 1, weekdays: [], monthlyBy: 'DAY_OF_MONTH', ...end };
    case 'MONTHLY_WEEKDAY': return { frequency: 'MONTHLY', interval: 1, weekdays: [], monthlyBy: 'WEEKDAY_OF_MONTH', ...end };
    case 'YEARLY': return { frequency: 'YEARLY', interval: 1, weekdays: [], ...end };
  }
}

/**
 * The rule after the first day moved: a weekly rule that only had the old weekday follows the new one, and any other
 * weekly rule takes the new weekday in, since the first day is always an occurrence.
 */
export function movedRule(rule: Recurrence | null, from: string, to: string): Recurrence | null {
  if (!rule || rule.frequency !== 'WEEKLY') return rule;
  const next = weekdayOfDay(to);
  if (rule.weekdays.length === 1 && rule.weekdays[0] === weekdayOfDay(from)) return { ...rule, weekdays: [next] };
  return rule.weekdays.includes(next) ? rule : { ...rule, weekdays: [...rule.weekdays, next] };
}

/** Such as 매주 월·수, 매주 평일, 2주마다 화요일, 매월 마지막 금요일, with how it ends: · 10회, · 12월 31일까지. */
export function describeRule(rule: Recurrence, day: string): string {
  const days = WEEKDAY_ORDER.filter(weekday => (rule.weekdays.length ? rule.weekdays : [weekdayOfDay(day)]).includes(weekday));
  const every = (unit: string, plain: string) => (rule.interval === 1 ? plain : `${rule.interval}${unit}마다`);
  const what = rule.frequency === 'DAILY' ? every('일', '매일')
    : rule.frequency === 'WEEKLY' ? `${every('주', '매주')} ${isWorkweek(days) ? '평일' : days.length === 1 ? `${weekdayName(days[0] ?? 'SUNDAY')}요일` : days.map(weekdayName).join('·')}`
      : rule.frequency === 'MONTHLY' ? `${every('개월', '매월')} ${rule.monthlyBy === 'WEEKDAY_OF_MONTH' ? `${ordinalOf(day)} ${weekdayName(weekdayOfDay(day))}요일` : `${Number(day.slice(8))}일`}`
        : `${every('년', '매년')} ${monthDay(day)}`;
  const end = rule.count ? ` · ${rule.count}회` : rule.until ? ` · ${rule.until.slice(0, 4) === day.slice(0, 4) ? '' : `${rule.until.slice(0, 4)}년 `}${monthDay(rule.until)}까지` : '';
  return what + end;
}

/**
 * The day a repeating event's rule counts from while its form shows the given day: the series' first day (else the
 * day the occurrence was due), moved by as many days as the form moved the occurrence it was opened on. An event that
 * does not repeat counts from the day shown.
 */
export function ruleDay(event: { start: string; occurrence?: string; seriesStart?: string; recurrence?: Recurrence } | undefined, day: string): string {
  const first = event?.recurrence ? (event.seriesStart ?? event.occurrence)?.slice(0, 10) : undefined;
  return first && event ? addDays(first, daysCounted(event.start.slice(0, 10), day) - 1) : day;
}

/** The rule as the editor reads it back, from the first day: 10월 6일부터 2주마다 화·목 · 10회. */
export const ruleSentence = (rule: Recurrence, day: string) => `${monthDay(day)}부터 ${describeRule(rule, day)}`;

export const sameRule = (one: Recurrence | null | undefined, other: Recurrence | null | undefined) => {
  if (!one || !other) return !one && !other;
  return one.frequency === other.frequency && one.interval === other.interval && (one.monthlyBy ?? 'DAY_OF_MONTH') === (other.monthlyBy ?? 'DAY_OF_MONTH')
    && (one.count ?? null) === (other.count ?? null) && (one.until ?? null) === (other.until ?? null)
    && [...one.weekdays].sort().join() === [...other.weekdays].sort().join();
};

export const SCOPES: readonly { value: EventScope; label: string }[] = [
  { value: 'THIS', label: '이 일정만' },
  { value: 'FOLLOWING', label: '이 일정과 이후 일정' },
  { value: 'ALL', label: '모든 반복 일정' },
];
