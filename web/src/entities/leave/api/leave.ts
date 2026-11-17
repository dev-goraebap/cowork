import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { getJson, type components } from '@/shared/api';

type Schemas = components['schemas'];
type WithRequired<T, K extends keyof T> = T & { [P in K]-?: NonNullable<T[P]> };

export type LeaveSummary = WithRequired<Schemas['Summary'], 'balance' | 'pending' | 'available'>;
export type LeaveSlot = Schemas['LeaveDetail']['slot'];
export type LeaveDetail = Schemas['LeaveDetail'];
/** The detail an approval request of kind LEAVE carries. */
export type LeaveView = Schemas['LeaveView'];
export const LEAVE_KIND = 'LEAVE';

/** The leave a request of kind LEAVE asks for; undefined for any other kind. */
export const leaveOf = (request: { kind: string; detail?: unknown }) =>
  (request.kind === LEAVE_KIND ? request.detail as LeaveView | undefined : undefined);

/** Leave reads live under ['leave']; a request's approval changes the summary, so commands invalidate it. */
export const leaveKeys = { all: ['leave'] as const };

/** The member's annual leave: balance, days in requests still in review, and what new requests may use. */
export const leaveSummaryOptions = () => queryOptions({
  queryKey: [...leaveKeys.all, 'summary'],
  queryFn: ({ signal }) => getJson<LeaveSummary>('/api/v1/office/leave/summary', signal),
});

/**
 * Approved leave days falling in one month: annual and special count every day, and the scheduled values are the part
 * of them after today, leave approved but still to come.
 */
export type MonthUsage = { month: number; annual: number; special: number; annualScheduled?: number; specialScheduled?: number };

/** The member's approved leave days of the year, month by month, annual and special apart. */
export const leaveUsageOptions = (year: number) => queryOptions({
  queryKey: [...leaveKeys.all, 'usage', year],
  queryFn: async ({ signal }) => (await getJson<{ year: number; months: MonthUsage[] }>(`/api/v1/office/leave/usage?year=${year}`, signal)).months,
});

export type SpecialType = WithRequired<Schemas['SpecialType'], 'id' | 'name' | 'classification' | 'durationBasis' | 'requiresReason' | 'requiresAttachment'>;
export type SpecialCatalog = { genderLimited: boolean; types: SpecialType[]; relations: { relation: string; days: number }[] };

/** Special leave the member may ask for, with what is left of leave granted ahead or by quota. */
export const specialCatalogOptions = () => queryOptions({
  queryKey: [...leaveKeys.all, 'types'],
  queryFn: ({ signal }) => getJson<SpecialCatalog>('/api/v1/office/leave/types', signal),
});

export type WorkCalendar = WithRequired<Schemas['Calendar'], 'workingDays' | 'holidays' | 'blocks'>;
/** A leave of the member that a new request may not overlap: in review or approved. */
export type Booking = WithRequired<Schemas['Booking'], 'slot' | 'startDate' | 'endDate'>;

/** Working weekdays, holidays and partial-day time blocks between two dates; they rarely change. */
export const workCalendarOptions = (from: string, to: string) => queryOptions({
  queryKey: [...leaveKeys.all, 'calendar', from, to],
  queryFn: ({ signal }) => getJson<WorkCalendar>(`/api/v1/office/leave/calendar?${new URLSearchParams({ from, to })}`, signal),
  staleTime: 5 * 60_000,
});

/** The member's open leaves between two dates, which a new request may not overlap. */
export const bookingsOptions = (from: string, to: string) => queryOptions({
  queryKey: [...leaveKeys.all, 'bookings', from, to],
  queryFn: ({ signal }) => getJson<Booking[]>(`/api/v1/office/leave/bookings?${new URLSearchParams({ from, to })}`, signal),
});

/** What a leave would take, what it could still take and the first day an event's days stop. */
export type LeavePreview = { days: number; available?: number | null; expiryDate?: string | null };
export type PreviewDraft = { slot: LeaveSlot; start: string; end: string; typeId?: string; eventDate?: string; relation?: string };

/** The days a leave would take, as the server counts them; a special leave's type and event change the count. */
export const previewOptions = ({ slot, start, end, typeId, eventDate, relation }: PreviewDraft) => queryOptions({
  queryKey: [...leaveKeys.all, 'preview', slot, start, end, typeId ?? '', eventDate ?? '', relation ?? ''],
  queryFn: ({ signal }) => {
    const params = new URLSearchParams({ slot, startDate: start, endDate: end });
    if (typeId) params.set('leaveTypeId', typeId);
    if (eventDate) params.set('eventDate', eventDate);
    if (relation) params.set('relation', relation);
    return getJson<LeavePreview>(`/api/v1/office/leave/preview?${params}`, signal);
  },
  retry: false,
});

export type TeamLeave = WithRequired<Schemas['CalendarLeave'], 'requestId' | 'employeeId' | 'typeName' | 'slot' | 'startDate' | 'endDate'>;
export type TeamHoliday = WithRequired<Schemas['CalendarHoliday'], 'date' | 'name'>;
export type TeamCalendar = { holidays: TeamHoliday[]; leaves: TeamLeave[] };

/** Approved leaves and holidays between two dates, such as a request's period; events and overtime are not read. */
export const teamCalendarOptions = (from: string, to: string) => queryOptions({
  queryKey: [...leaveKeys.all, 'team-calendar', from, to],
  queryFn: ({ signal }) => getJson<TeamCalendar>(`/api/v1/office/calendar/items?${new URLSearchParams({ from, to, sources: 'LEAVE,HOLIDAY' })}`, signal),
  placeholderData: keepPreviousData,
});
