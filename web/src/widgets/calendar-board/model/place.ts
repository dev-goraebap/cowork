import { useNavigate } from '@tanstack/react-router';
import { usePageLocation } from '@/shared/lib/route-location';
import { addMonths, seoulDay } from '@/entities/calendar';
import { monthWeeks } from '@/entities/event';

const DAY = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/**
 * Where the calendar is, kept in its address so a page opened from it comes back to the same place: the chosen day
 * (?date=, today when left out). 캘린더는 달 보기 하나다(2026-11-15 주간 보기를 지웠다. 예전 ?view=week 주소는 달로 연다).
 */
export function useCalendarPlace(base: string) {
  const { searchStr } = usePageLocation();
  const navigate = useNavigate();
  const { day, today, days } = calendarPlace(searchStr);
  const go = (next: { date?: string }, replace = false) => {
    const nextDay = next.date ?? day;
    const params = new URLSearchParams();
    if (nextDay !== today) params.set('date', nextDay);
    const text = params.toString();
    void navigate({ href: text ? `${base}?${text}` : base, replace });
  };
  const step = (by: number) => go({ date: addMonths(day, by) });
  return { day, today, days, go, step };
}

/** The place an address names, and the days the calendar reads for it (the six weeks of the month). */
export function calendarPlace(searchStr: string) {
  const query = new URLSearchParams(searchStr);
  const today = seoulDay();
  const raw = query.get('date') ?? '';
  const day = DAY.test(raw) ? raw : today;
  return { day, today, days: monthWeeks(day).flat() };
}
