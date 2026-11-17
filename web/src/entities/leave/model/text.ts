import type { LeaveSlot, LeaveView } from '../api/leave';

export const slotLabels: Record<LeaveSlot, string> = {
  FULL_DAY: '종일', HALF_DAY_AM: '오전 반차', HALF_DAY_PM: '오후 반차',
  QUARTER_DAY_1: '반반차 1', QUARTER_DAY_2: '반반차 2', QUARTER_DAY_3: '반반차 3', QUARTER_DAY_4: '반반차 4',
};

/** Who the bereavement policy names, as members read it. */
export const relationLabels: Record<string, string> = {
  SELF: '본인', SPOUSE: '배우자', PARENT: '부모', PARENT_IN_LAW: '배우자의 부모', CHILD: '자녀',
  GRANDPARENT: '조부모', GRANDPARENT_IN_LAW: '배우자의 조부모', SIBLING: '형제자매',
};

const time = (value?: string) => (value ? value.slice(0, 5) : '');

/** The event a special leave is for, such as "사건일 2026-09-20 · 부모". */
export function leaveEventText(leave: LeaveView): string | undefined {
  if (!leave.eventDate) return undefined;
  const relation = leave.relation ? ` · ${relationLabels[leave.relation] ?? leave.relation}` : '';
  return `사건일 ${leave.eventDate}${relation}`;
}

/** A leave's days and slot: "2026-10-08 오후 반차 13:00~18:00", "2026-10-08 ~ 2026-10-10 종일". */
export function leavePeriodText(leave: LeaveView): string {
  const slot = slotLabels[leave.slot as LeaveSlot] ?? leave.slot ?? '';
  if (leave.startDate === leave.endDate) {
    const hours = leave.startTime && leave.endTime ? ` ${time(leave.startTime)}~${time(leave.endTime)}` : '';
    return `${leave.startDate} ${slot}${hours}`;
  }
  return `${leave.startDate} ~ ${leave.endDate} ${slot}`;
}

/** 1.5 → "1.5", 0.25 → "0.25", 2 → "2". */
export const formatDays = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0$/, ''));

/** Days with their unit: 1.5 → "1.5일". */
export const dayText = (days: number) => `${formatDays(days)}일`;

/** 2027-01-02 → "2027.1.2". */
export const shortDateText = (iso?: string) => (iso ? `${Number(iso.slice(0, 4))}.${Number(iso.slice(5, 7))}.${Number(iso.slice(8))}` : '');

/** This month in Seoul as 2026-09. */
export const currentMonth = (now = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit' }).format(now).slice(0, 7);

export function shiftMonth(month: string, by: number): string {
  const date = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)) - 1 + by, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export const monthTitle = (month: string) => `${month.slice(0, 4)}년 ${Number(month.slice(5))}월`;

/** A month from the address, or undefined when it is not one. */
export const parseMonth = (raw: unknown) => (typeof raw === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(raw) ? raw : undefined);
