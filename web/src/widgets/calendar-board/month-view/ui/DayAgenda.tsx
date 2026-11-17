import type { ReactNode } from 'react';
import { awayText, duration, hourMinute } from '@/entities/calendar';
import { covers, dayTitle, EventDot, isBar, timeRange, type CalendarEvent } from '@/entities/event';
import { PersonAvatar } from '@/shared/ui/person';
import type { Source } from '../../model/items';
import type { MarkTrigger, MarkWrap } from '../../model/mark';

const GROUPS = [
  { kind: 'event', label: '일정' },
  { kind: 'leave', label: '휴가' },
  { kind: 'overtime', label: '연장근무' },
] as const;

const personOf = (source?: Source) =>
  (source?.kind === 'leave' ? source.leave.employeeId : source?.kind === 'overtime' ? source.overtime.employeeId : undefined);

/** The day's marks by kind (일정, then 휴가 and 연장근무 counted in people), bars first, then by when they start. */
function groupsOn(day: string, events: readonly CalendarEvent[], sources?: ReadonlyMap<string, Source>) {
  const ordered = events.filter(event => covers(event, day))
    .sort((a, b) => Number(isBar(b)) - Number(isBar(a)) || a.start.localeCompare(b.start));
  return GROUPS.flatMap(group => {
    const entries = ordered.filter(event => (event.kind ?? 'event') === group.kind);
    if (!entries.length) return [];
    const count = group.kind === 'event' ? entries.length : new Set(entries.map(event => personOf(sources?.get(event.id)) ?? event.id)).size;
    return [{ ...group, entries, summary: `${group.label} ${count}${group.kind === 'event' ? '' : '명'}` }];
  });
}

const ROW = '-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-md px-2 py-2.5 text-left outline-none hover:bg-row-hover focus-visible:ring-2 focus-visible:ring-ring';

function Row({ start, title, facts }: { start: ReactNode; title: string; facts: string }) {
  return <>
    {start}
    <span className="flex min-w-0 flex-col gap-0.5">
      <span className="truncate">{title}</span>
      {facts ? <span className="truncate text-xs text-muted-foreground tabular-nums">{facts}</span> : null}
    </span>
  </>;
}

/** One line of the list (the button itself, so a wrap can take its press): a person's picture for a leave or overtime, an event's time and colour for an event. */
function agendaRow(event: CalendarEvent, source?: Source): MarkTrigger {
  if (source?.kind === 'leave' || source?.kind === 'overtime') {
    const person = source.kind === 'leave' ? source.leave : source.overtime;
    const facts = source.kind === 'leave'
      ? awayText({ departmentName: person.departmentName, leaves: [source.leave] })
      : [person.departmentName, `${hourMinute(source.overtime.start)}–${hourMinute(source.overtime.end)}${source.overtime.nextDay ? ' (다음 날)' : ''}`,
        `인정 ${duration(source.overtime.minutes)}`].filter(Boolean).join(' · ');
    return <button type="button" className={ROW}>
      <Row start={<PersonAvatar id={person.employeeId} name={person.name} size={32} isStatic />} title={person.name ?? '알 수 없음'} facts={facts} />
    </button>;
  }
  const detail = source?.kind === 'event' ? source.event : undefined;
  const type = detail ? (detail.visibility === 'PERSONAL' ? '나만 보는 일정' : detail.projectName ?? '회사 일정') : undefined;
  const time = <span className="flex w-12 shrink-0 flex-col text-xs tabular-nums">
    <span>{isBar(event) ? '종일' : hourMinute(event.start)}</span>
    {isBar(event) ? null : <span className="text-muted-foreground">{hourMinute(event.end)}</span>}
  </span>;
  return <button type="button" className={ROW}>
    <Row start={<>{time}<EventDot color={event.color} /></>} title={event.title}
      facts={[detail ? type : timeRange(event), event.location].filter(Boolean).join(' · ')} />
  </button>;
}

/**
 * A phone's list under the compact month: the chosen day's title (a holiday's name beside it in the day-off colour),
 * then its events, leave and overtime in groups; a line opens what it stands for (wrap).
 */
export function DayAgenda({ day, events, holiday, sources, wrap }: {
  day: string; events: readonly CalendarEvent[]; holiday?: string; sources?: ReadonlyMap<string, Source>; wrap?: MarkWrap;
}) {
  const groups = groupsOn(day, events, sources);
  return <section aria-label={`${dayTitle(day)} 일정`} className="flex flex-1 flex-col gap-3 bg-background px-4 py-3">
    <h2 className="text-base font-semibold">
      {dayTitle(day)}
      {holiday ? <span className="text-sm font-medium text-day-off"> {holiday}</span> : null}
    </h2>
    {groups.length === 0 ? <p className="py-2 text-sm text-muted-foreground">이날은 일정이 없습니다.</p> : groups.map(group =>
      <section key={group.kind} aria-label={group.summary} className="flex flex-col gap-1">
        <p className="text-xs font-medium text-muted-foreground">{group.summary}</p>
        <ul className="flex flex-col divide-y">
          {group.entries.map(event => {
            const row = agendaRow(event, sources?.get(event.id));
            return <li key={event.id}>{wrap ? wrap(event, row) : row}</li>;
          })}
        </ul>
      </section>)}
  </section>;
}
