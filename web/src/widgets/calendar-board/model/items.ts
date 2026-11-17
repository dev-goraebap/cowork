import {
  eventKey, hourMinute, isPartDay, lastDayOf, leaveKindText, openRuns, type CalendarEventItem, type CalendarFeed, type CalendarLeave, type CalendarOvertime,
} from '@/entities/calendar';
import { dayOf, type CalendarEvent, type EventColor, type Holiday } from '@/entities/event';

/** What the calendar can show besides holidays' names, each turned on or off by its filter. */
export type Kind = 'COMPANY' | 'LEAVE' | 'OVERTIME' | 'HOLIDAY';
export const KINDS: readonly Kind[] = ['COMPANY', 'LEAVE', 'OVERTIME', 'HOLIDAY'];

/** What a mark on the calendar stands for, to open its page when pressed. */
export type Source = { kind: 'event'; event: CalendarEventItem } | { kind: 'leave'; leave: CalendarLeave } | { kind: 'overtime'; overtime: CalendarOvertime };

const COLORS: readonly EventColor[] = ['blue', 'green', 'orange', 'purple', 'red', 'teal', 'pink', 'yellow', 'gray'];
/** An event in its project's colour when that is one of the theme's, else the company's blue or one's own purple. */
const colorOf = (event: CalendarEventItem): EventColor => {
  const project = COLORS.find(color => color === event.projectColor);
  return project ?? (event.visibility === 'PERSONAL' ? 'purple' : 'blue');
};

/**
 * An event as the month and the week draw it: a whole day, or one over days, by its first and last day; a timed one by
 * its minutes, an end at midnight kept on the day before so it does not reach into the next.
 */
function eventMark(event: CalendarEventItem): CalendarEvent {
  const id = eventKey(event);
  const common = { id, title: event.title, color: colorOf(event), location: event.location, kind: 'event' as const };
  if (event.allDay) return { ...common, start: dayOf(event.start), end: lastDayOf(event), isAllDay: true };
  const last = lastDayOf(event);
  const end = last < dayOf(event.end) ? `${last}T23:59` : event.end.slice(0, 16);
  return { ...common, start: event.start.slice(0, 16), end };
}

/**
 * A person's leave as bars over its open days, none over weekends and holidays (client's team calendar): the name and
 * its kind, a half or quarter day with its hours. One's own leave still in review is grey.
 */
function leaveMarks(leave: CalendarLeave, closed: ReadonlySet<string>): CalendarEvent[] {
  const hours = isPartDay(leave) ? ` ${hourMinute(leave.startTime)}–${hourMinute(leave.endTime)}` : '';
  const title = `${leave.name ?? '알 수 없음'} ${leaveKindText(leave)}${hours}`;
  return openRuns(leave.startDate, leave.endDate, closed).map(run => ({
    id: `leave:${leave.requestId}:${run.start}:${leave.startTime ?? ''}`, title, start: run.start, end: run.end, isAllDay: true,
    color: leave.pending ? 'gray' : 'orange', kind: 'leave',
  }));
}

/**
 * The feed as the month and week views draw it, narrowed to the kinds shown (all when none is chosen) and, for a
 * project's calendar, to that project's events: the marks, the holidays named, and what each mark stands for.
 */
export function boardItems(feed: CalendarFeed | undefined, shown: readonly Kind[], project?: string) {
  const on = (kind: Kind) => shown.length === 0 || shown.includes(kind);
  const closed = new Set((feed?.holidays ?? []).map(holiday => holiday.date));
  const events = (feed?.events ?? []).filter(event => on('COMPANY') && (!project || event.projectKey === project));
  const leaves = project || !on('LEAVE') ? [] : feed?.leaves ?? [];
  const sources = new Map<string, Source>();
  const marks: CalendarEvent[] = [];
  for (const event of events) {
    const mark = eventMark(event);
    sources.set(mark.id, { kind: 'event', event });
    marks.push(mark);
  }
  for (const leave of leaves) for (const mark of leaveMarks(leave, closed)) {
    sources.set(mark.id, { kind: 'leave', leave });
    marks.push(mark);
  }
  if (!project && on('OVERTIME')) for (const overtime of feed?.overtimes ?? []) {
    const id = `overtime:${overtime.requestId}:${overtime.date}`;
    marks.push({ id, title: `${overtime.name ?? '알 수 없음'} 연장근무`,
      start: `${overtime.date}T${hourMinute(overtime.start)}`,
      end: `${overtime.date}T${overtime.nextDay ? '23:59' : hourMinute(overtime.end)}`,
      color: 'teal', kind: 'overtime' });
    sources.set(id, { kind: 'overtime', overtime });
  }
  const holidays: Holiday[] = on('HOLIDAY') ? (feed?.holidays ?? []).map(holiday => ({ day: holiday.date, name: holiday.name })) : [];
  return { marks, holidays, sources };
}
