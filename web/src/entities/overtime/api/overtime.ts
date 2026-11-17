import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { getJson, type components } from '@/shared/api';

type Schemas = components['schemas'];
type WithRequired<T, K extends keyof T> = T & { [P in K]-?: NonNullable<T[P]> };

export type OvertimeSpan = WithRequired<Schemas['OvertimeSpanView'], 'start' | 'end' | 'nextDay'>;
export type OvertimeDay = WithRequired<Omit<Schemas['OvertimeDayView'], 'segments'>, 'date' | 'excludedMinutes' | 'recognizedMinutes'>
  & { segments: OvertimeSpan[] };
/** The detail an approval request of kind OVERTIME carries: its days, oldest first, their total and whether it was asked for late. */
export type OvertimeView = { days: OvertimeDay[]; recognizedMinutes: number; projectId?: string; late?: boolean };
export type OvertimeMonthDay = WithRequired<Omit<Schemas['OvertimeMonthDay'], 'day'>, 'requestId' | 'status'> & { day: OvertimeDay };
export type OvertimeMonth = WithRequired<Omit<Schemas['OvertimeMonth'], 'days'>, 'month' | 'approvedMinutes' | 'inReviewMinutes'>
  & { days: OvertimeMonthDay[] };
export type OvertimeDetail = Schemas['OvertimeDetail'];
export const OVERTIME_KIND = 'OVERTIME';

/** Overtime reads live under ['overtime']; recording or deciding one changes them. */
export const overtimeKeys = { all: ['overtime'] as const };

/** The overtime a request of kind OVERTIME records; undefined for any other kind. */
export const overtimeOf = (request: { kind: string; detail?: unknown }) =>
  (request.kind === OVERTIME_KIND ? request.detail as OvertimeView | undefined : undefined);

/** The member's own overtime days of a month with the approved and in-review totals. */
export const overtimeMonthOptions = (month: string) => queryOptions({
  queryKey: [...overtimeKeys.all, 'month', month],
  queryFn: ({ signal }) => getJson<OvertimeMonth>(`/api/v1/office/overtime/days?${new URLSearchParams({ month })}`, signal),
  placeholderData: keepPreviousData,
});
