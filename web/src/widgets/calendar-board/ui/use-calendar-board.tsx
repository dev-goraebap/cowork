import { useQuery } from '@tanstack/react-query';
import { cloneElement, useEffect, useRef, type ReactNode } from 'react';
import { calendarFeedOptions, dayHref, eventHref, leaveHref, newEventHref, overtimeHref } from '@/entities/calendar';
import { monthTitle, type CalendarEvent } from '@/entities/event';
import { newRequestHref } from '@/entities/leave';
import { useOpenPanel, usePanel } from '@/shared/lib/panel';
import { useIsMobile } from '@/shared/lib/use-mobile';
import { FilterBar, FilterChips, FilterMenu, useFilters, type FilterDef } from '@/shared/ui/filter';
import {
  ClockIcon, EventIcon, EyeIcon, FileTextIcon, HolidayIcon, UmbrellaIcon, type Icon,
} from '@/shared/ui/icon';
import { PageState } from '@/shared/ui/page-state';
import { MonthView } from '../month-view';
import { boardItems, KINDS, type Kind } from '../model/items';
import { useShownKinds } from '../model/kinds';
import type { MarkWrap } from '../model/mark';
import { useCalendarPlace } from '../model/place';
import { CalendarNav } from './CalendarNav';

/** What the 새로 만들기 menu offers, for the page to lay out (a menu on a desktop, a sheet from the FAB on a phone). */
export type CreateOption = { id: string; label: string; icon: Icon; onSelect: () => void };

const KIND_FILTER: FilterDef<'kinds'> = {
  key: 'kinds', label: '보이기', icon: EyeIcon, options: [
    { value: 'COMPANY', label: '일정', icon: <EventIcon /> },
    { value: 'LEAVE', label: '휴가', icon: <UmbrellaIcon /> },
    { value: 'OVERTIME', label: '연장근무', icon: <ClockIcon /> },
    { value: 'HOLIDAY', label: '공휴일', icon: <HolidayIcon /> },
  ],
};
const SOURCE_NAMES: Record<string, string> = { LEAVE: '휴가', OVERTIME: '연장근무', HOLIDAY: '공휴일' };
const OPEN_DAY = /^\/office\/schedule\/days\/(\d{4}-\d{2}-\d{2})$/;

/** A key pressed while typing, with a modifier, or under an open dialog or popover is not meant for the calendar. */
const isForCalendar = (event: KeyboardEvent) => {
  if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return false;
  const target = event.target as HTMLElement | null;
  if (target?.closest('input, textarea, select, [contenteditable="true"], [role="combobox"], [role="listbox"], [role="menu"]')) return false;
  return !document.querySelector('dialog[open], [role="dialog"], [role="alertdialog"]');
};

/**
 * The team calendar for a page to lay out: 월간 · 주간 as its views, the month's title, 오늘 and the chevrons (and, for the
 * workspace's calendar, the 보이기 filter) as its tools, the filter's chips below, and the calendar itself. A day's cell
 * opens that day's list over the calendar; a mark opens its summary beside it (크게 보기 goes to its page). A phone
 * chooses the day under the compact month or the week's chips and opens a mark's page straight away.
 * A project's calendar (project) shows only its events and holidays.
 */
export function useCalendarBoard({ base, project }: { base: string; project?: string }): {
  tools: ReactNode; below?: ReactNode; content: ReactNode; createNew: () => void; createOptions: CreateOption[];
} {
  const isPhone = useIsMobile();
  const place = useCalendarPlace(base);
  const { day, today, days } = place;
  const feed = useQuery(calendarFeedOptions(days[0] ?? day, days[days.length - 1] ?? day));
  const kinds = useShownKinds();
  const filters = useFilters([KIND_FILTER], {
    state: { kinds: kinds.shown },
    onStateChange: next => kinds.save(KINDS.filter(kind => (next.kinds ?? []).includes(kind)) as Kind[]),
  });
  const { marks, holidays, sources } = boardItems(feed.data, project ? [] : kinds.shown, project);
  const openPanel = useOpenPanel();
  const openedDay = OPEN_DAY.exec(usePanel().pathname ?? '')?.[1];

  const targetDate = day < today ? today : day;
  const createNew = () => openPanel(newEventHref({ date: targetDate, project }));
  const createOptions: CreateOption[] = [
    { id: 'event', label: '일정 등록', icon: EventIcon, onSelect: createNew },
    { id: 'annual', label: '연차 신청', icon: UmbrellaIcon, onSelect: () => openPanel(newRequestHref({ kind: 'annual', date: targetDate })) },
    { id: 'special', label: '그 외 휴가', icon: FileTextIcon, onSelect: () => openPanel(newRequestHref({ kind: 'special', date: targetDate })) },
    { id: 'overtime', label: '연장근무 신청', icon: ClockIcon, onSelect: () => openPanel(newRequestHref({ kind: 'overtime', date: targetDate })) },
  ];
  const pageOf = (id: string) => {
    const source = sources.get(id);
    if (!source) return undefined;
    if (source.kind === 'event') return eventHref(source.event);
    return source.kind === 'leave' ? leaveHref(source.leave.requestId) : overtimeHref(source.overtime.requestId);
  };
  // 막대(일정 · 휴가 · 연장근무)를 누르면 요약 팝오버 없이 바로 그 상세를 연다: 데스크톱은 캘린더 위 대화상자, 휴대폰은 그 페이지.
  const wrap: MarkWrap = (event: CalendarEvent, trigger) => {
    const href = pageOf(event.id);
    if (!href) return trigger;
    return cloneElement(trigger, { onClick: () => openPanel(href) });
  };
  const showDay = (date: string) => openPanel(dayHref(date));

  const keys = useRef<(event: KeyboardEvent) => void>(() => undefined);
  keys.current = event => {
    if (isPhone || !isForCalendar(event)) return;
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (key === 'ArrowLeft' || key === 'ArrowRight') place.step(key === 'ArrowLeft' ? -1 : 1);
    else if (key === 't') place.go({ date: today });
    else if (key === 'n') createNew();
    else return;
    event.preventDefault();
  };
  useEffect(() => {
    const listen = (event: KeyboardEvent) => keys.current(event);
    window.addEventListener('keydown', listen);
    return () => window.removeEventListener('keydown', listen);
  }, []);

  const nav = <CalendarNav day={day} onToday={() => place.go({ date: today })} onStep={place.step} />;
  // 데스크톱: 달 · 오늘 · 꺾쇠 · 필터가 페이지 머리 줄(새로 만들기 왼쪽)에 선다(보기 탭이 없어 도구 줄이 없다). 휴대폰: 꺾쇠는 달 이름 줄에.
  const tools = <>
    {isPhone ? null : nav}
    {project ? null : <FilterMenu filters={filters} />}
  </>;
  const below = project ? undefined : isPhone ? <FilterChips filters={filters} /> : <FilterBar filters={filters} />;

  const failed = (feed.data?.failedSources ?? []).map(source => SOURCE_NAMES[source] ?? source);
  // A phone's chosen day lives in the address (?date=), so a page opened from the list comes back to it.
  const choose = (date: string) => place.go({ date }, true);
  const calendar = <MonthView month={day} today={today} events={marks} holidays={holidays} sources={sources} selected={isPhone ? day : openedDay}
      onSelect={choose} onShowDay={showDay} wrap={wrap} />;
  const content = feed.isError && !feed.data
    ? <PageState kind="error" title="일정을 불러오지 못했습니다" description={feed.error.message} />
    : <>
      {failed.length > 0
        ? <p className="shrink-0 border-b bg-background px-4 py-2 text-sm text-muted-foreground">{failed.join(' · ')}을(를) 불러오지 못해 빼고 보여 줍니다.</p>
        : null}
      {/* 휴대폰: 달 이름이 달력 머리에 서고, 그 줄 오른쪽에 오늘 · 꺾쇠. */}
      {isPhone ? <div className="flex shrink-0 items-center justify-between gap-2 bg-background px-4 pt-3 pb-1">
        <p aria-hidden className="text-base font-semibold tabular-nums">{monthTitle(day)}</p>
        {nav}
      </div> : null}
      {calendar}
    </>;
  return { tools, below, content, createNew, createOptions };
}
