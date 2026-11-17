import type { CalendarEventItem, CalendarLeave, CalendarOvertime } from '../api/calendar';
import { addDays, hourMinute, lastDayOf, shortDay } from './dates';

const NONE: ReadonlySet<string> = new Set();

/** A leave's part of a day, as members read it. */
export const SLOT_LABELS: Record<string, string> = {
  FULL_DAY: '종일', HALF_DAY_AM: '오전 반차', HALF_DAY_PM: '오후 반차',
  QUARTER_DAY_1: '반반차 1', QUARTER_DAY_2: '반반차 2', QUARTER_DAY_3: '반반차 3', QUARTER_DAY_4: '반반차 4',
};

/**
 * Saturdays, Sundays and holidays, when nobody is away on leave: a leave over them is drawn in pieces between them and
 * is not counted on them. closed holds the holidays whether or not they are shown.
 */
export const isClosed = (day: string, closed: ReadonlySet<string>) => {
  const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
  return weekday === 0 || weekday === 6 || closed.has(day);
};

/** The runs of open days in a leave, each from its first day to its last. */
export function openRuns(start: string, end: string, closed: ReadonlySet<string>): { start: string; end: string }[] {
  const runs: { start: string; end: string }[] = [];
  let from: string | null = null;
  for (let day = start; day <= end; day = addDays(day, 1)) {
    if (isClosed(day, closed)) {
      if (from) runs.push({ start: from, end: addDays(day, -1) });
      from = null;
    } else from ??= day;
  }
  if (from) runs.push({ start: from, end });
  return runs;
}

/** A half or quarter day of leave with its hours. */
export const isPartDay = (leave: CalendarLeave) =>
  leave.slot !== 'FULL_DAY' && !!leave.startTime && !!leave.endTime && leave.startDate === leave.endDate;

/** A leave's kind as a bar names it: its type for whole days, 반차 or 반반차 for part of one, 결재 중 first while in review. */
export const leaveKindText = (leave: CalendarLeave) =>
  `${leave.pending ? '결재 중 · ' : ''}${leave.slot === 'FULL_DAY' ? leave.typeName : leave.slot.startsWith('HALF') ? '반차' : '반반차'}`;

/** Each day's approved overtime, earliest start first. */
export function overtimesByDay(overtimes: readonly CalendarOvertime[]): Map<string, CalendarOvertime[]> {
  const byDay = new Map<string, CalendarOvertime[]>();
  for (const item of [...overtimes].sort((a, b) => a.start.localeCompare(b.start))) byDay.set(item.date, [...(byDay.get(item.date) ?? []), item]);
  return byDay;
}

/** One person away on a day with every leave of theirs that covers it, such as a first and a last quarter day. */
export type PersonAway = { employeeId: string; name?: string; departmentName?: string; leaves: CalendarLeave[] };

/**
 * Who is away on the day, once each however many leaves they took on it, earliest leave first; nobody on a weekend or
 * holiday. In the order the leaves came in, by each person's first leave.
 */
export function peopleAway(day: string, leaves: readonly CalendarLeave[], closed: ReadonlySet<string> = NONE): PersonAway[] {
  if (isClosed(day, closed)) return [];
  const people = new Map<string, PersonAway>();
  for (const leave of leaves.filter(item => item.startDate <= day && day <= item.endDate)) {
    const person = people.get(leave.employeeId);
    if (person) person.leaves.push(leave);
    else people.set(leave.employeeId, { employeeId: leave.employeeId, name: leave.name, departmentName: leave.departmentName, leaves: [leave] });
  }
  for (const person of people.values()) person.leaves.sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? ''));
  return [...people.values()];
}

/** How many different people there are among these, for counts said in 명. */
export const headcount = (items: readonly { employeeId: string }[]) => new Set(items.map(item => item.employeeId)).size;

/** The events on the day, all-day ones first, then by when they start. */
export const eventsOn = (day: string, events: readonly CalendarEventItem[]) =>
  events.filter(event => event.start.slice(0, 10) <= day && day <= lastDayOf(event))
    .sort((a, b) => Number(b.allDay) - Number(a.allDay) || a.start.localeCompare(b.start));

/**
 * Who is away on leave on a day, or during part of it when a time is given: a whole-day leave covers the day, a half
 * or quarter day only the hours it holds. Nobody is away on a weekend or a holiday, and leave still in review is not
 * counted yet.
 */
export function awayDuring(leaves: readonly CalendarLeave[], closed: ReadonlySet<string>, day: string, from?: string, to?: string): Set<string> {
  if (isClosed(day, closed)) return new Set();
  return new Set(leaves
    .filter(leave => !leave.pending && leave.startDate <= day && day <= leave.endDate)
    .filter(leave => !from || !to || !leave.startTime || !leave.endTime
      || (leave.startTime.slice(0, 5) < to.slice(0, 5) && from.slice(0, 5) < leave.endTime.slice(0, 5)))
    .map(leave => leave.employeeId));
}

const period = (leave: CalendarLeave) => (leave.startDate === leave.endDate ? '하루' : `${shortDay(leave.startDate)}~${shortDay(leave.endDate)}`);
const partText = (leave: CalendarLeave) => (leave.slot === 'FULL_DAY' ? period(leave)
  : `${SLOT_LABELS[leave.slot] ?? leave.slot} ${hourMinute(leave.startTime)}~${hourMinute(leave.endTime)}`);
/** A person's leave on the day in one line, every leave of theirs in it: 개발팀 · 연차 · 반반차 1 09:00~11:00, 반반차 4 15:00~17:00. */
export const awayText = ({ departmentName, leaves }: Pick<PersonAway, 'departmentName' | 'leaves'>) => {
  const pending = leaves.every(leave => leave.pending);
  return [pending ? '결재 중' : undefined, departmentName, [...new Set(leaves.map(leave => leave.typeName))].join('·'),
    leaves.map(leave => `${partText(leave)}${!pending && leave.pending ? ' 결재 중' : ''}`).join(', '),
  ].filter(Boolean).join(' · ');
};
