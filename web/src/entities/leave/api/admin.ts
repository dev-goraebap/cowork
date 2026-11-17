import { infiniteQueryOptions, keepPreviousData, queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { getJson, sendCommand, sendJson, type components } from '@/shared/api';
import { leaveKeys } from './leave';

/*
 * 오피스 관리's reads and writes of leave (client/'s admin leave pages): every member's leave requests, every working
 * employee's leave left, and one employee's annual and special leave with the changes an administrator makes to them.
 * Every read sits under ['leave'] (an employee's requests under ['approval']), so a change reads them all again.
 */

type Schemas = components['schemas'];
type WithRequired<T, K extends keyof T> = T & { [P in K]-?: NonNullable<T[P]> };

/** A leave type as any list names it: its kind (GRANT, QUOTA, EVENT …), whether it is in use and may be granted by hand. */
export type LeaveTypeSummary = WithRequired<Schemas['TypeSummary'], 'id' | 'name' | 'classification' | 'active' | 'adjustable'>;
export type LeaveRequestItem = WithRequired<Schemas['LeaveRequestItem'], 'id' | 'requesterId' | 'status' | 'currentStep' | 'approverCount' | 'cancellableByAdmin'>;
type LeaveRequestSlice = { items: LeaveRequestItem[]; total: number; nextCursor?: string };
export type AllowanceColumn = WithRequired<Schemas['AllowanceColumn'], 'leaveTypeId' | 'name' | 'classification'>;
export type SpecialLeft = WithRequired<Schemas['SpecialLeft'], 'leaveTypeId' | 'days'>;
export type AllowanceRow = WithRequired<Omit<Schemas['AllowanceRow'], 'special'>, 'employeeId' | 'name' | 'annual'> & { special: SpecialLeft[] };
type AllowanceSlice = { columns: AllowanceColumn[]; items: AllowanceRow[]; total: number; nextCursor?: string };
export type AccrualRun = WithRequired<Schemas['AccrualRun'], 'succeeded' | 'failed' | 'accruedDays' | 'expiredDays' | 'quotaGrants' | 'specialExpiredDays'>;
export type AnnualLeaveStatus = WithRequired<Schemas['AnnualLeaveStatus'], 'opened' | 'balance' | 'pending' | 'available' | 'grants'>;
export type LedgerEntry = WithRequired<Schemas['LedgerEntry'], 'id' | 'type' | 'amount' | 'occurredAt'>;
type LedgerPage = Omit<WithRequired<Schemas['LedgerPage'], 'total'>, 'items'> & { items: LedgerEntry[] };
export type SpecialEntry = WithRequired<Schemas['SpecialEntry'], 'id' | 'type' | 'amount' | 'occurredAt'>;
export type SpecialGrant = WithRequired<Schemas['SpecialGrant'], 'id' | 'amount' | 'remaining'>;
export type SpecialAllowance = Omit<WithRequired<Schemas['SpecialAllowance'], 'id' | 'leaveTypeId' | 'available'>, 'grants' | 'entries'>
  & { grants: SpecialGrant[]; entries: SpecialEntry[] };

/** What every member's leave requests are narrowed by: status, the requester's name, leave types (ANNUAL or ids), a period the leave touches. */
export type LeaveRequestListing = { status?: string; q?: string; type?: string; from?: string; to?: string };
/** What the leave-left list is narrowed by: a name and departments (ids joined by commas). */
export type AllowanceListing = { q?: string; departmentId?: string };

const SLICE = 20;
export const LEDGER_SLICE = 10;
export const ADJUST_REASON_MAX = 500;
export const SPECIAL_REASON_MAX = 500;
export const SPECIAL_CHANGE_MAX = 365;
const adminKeys = {
  requests: [...leaveKeys.all, 'admin', 'requests'] as const,
  allowances: [...leaveKeys.all, 'admin', 'allowances'] as const,
};

const query = (listing: Record<string, string | undefined>, cursor?: string) => {
  const params = new URLSearchParams({ size: String(SLICE) });
  for (const [key, value] of Object.entries(listing)) if (value) params.set(key, value);
  if (cursor) params.set('cursor', cursor);
  return params;
};

/** Every leave type, in use or not, for filters and an administrator's choices. */
export const leaveTypesOptions = () => queryOptions({
  queryKey: [...leaveKeys.all, 'types', 'all'],
  queryFn: ({ signal }) => getJson<LeaveTypeSummary[]>('/api/v1/office/leave/types/all', signal),
  staleTime: 5 * 60_000,
});

/** Every member's leave requests, newest first, a slice at a time with how many match in all. */
export const leaveRequestsOptions = (listing: LeaveRequestListing) => infiniteQueryOptions({
  queryKey: [...adminKeys.requests, listing],
  queryFn: ({ pageParam, signal }) => getJson<LeaveRequestSlice>(`/api/v1/office/leave/requests?${query(listing, pageParam)}`, signal),
  initialPageParam: undefined as string | undefined,
  getNextPageParam: last => last.nextCursor ?? undefined,
  placeholderData: keepPreviousData,
});

/** Working employees' leave left, by department then name, a slice at a time; columns are the special leave shown. */
export const allowancesOptions = (listing: AllowanceListing) => infiniteQueryOptions({
  queryKey: [...adminKeys.allowances, listing],
  queryFn: ({ pageParam, signal }) => getJson<AllowanceSlice>(`/api/v1/office/leave/allowances?${query(listing, pageParam)}`, signal),
  initialPageParam: undefined as string | undefined,
  getNextPageParam: last => last.nextCursor ?? undefined,
  placeholderData: keepPreviousData,
});

/** Today's accrual, expiry and quota renewal, run now; each period is granted once however often it runs. */
export function useRunAccrual() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => sendJson<AccrualRun>('/api/v1/office/leave/accrual-runs', 'POST'),
    onSettled: () => client.invalidateQueries({ queryKey: leaveKeys.all }),
  });
}

const annualBase = (employeeId: string) => `/api/v1/office/leave/employees/${employeeId}/annual-leave`;

/** One employee's annual leave: the days now and the grants left in the order they are used. */
export const annualLeaveOptions = (employeeId: string) => queryOptions({
  queryKey: [...leaveKeys.all, 'employee', employeeId, 'status'],
  queryFn: ({ signal }) => getJson<AnnualLeaveStatus>(annualBase(employeeId), signal),
});

/** One employee's annual leave ledger, newest first, a slice at a time. */
export const ledgerOptions = (employeeId: string) => infiniteQueryOptions({
  queryKey: [...leaveKeys.all, 'employee', employeeId, 'ledger'],
  queryFn: ({ pageParam, signal }) => {
    const params = new URLSearchParams({ size: String(LEDGER_SLICE) });
    if (pageParam) params.set('cursor', pageParam);
    return getJson<LedgerPage>(`${annualBase(employeeId)}/entries?${params}`, signal);
  },
  initialPageParam: undefined as string | undefined,
  getNextPageParam: last => last.nextCursor ?? undefined,
});

/** One employee's special leave ledgers, those usable today first. */
export const specialLeaveOptions = (employeeId: string) => queryOptions({
  queryKey: [...leaveKeys.all, 'employee', employeeId, 'special'],
  queryFn: ({ signal }) => getJson<SpecialAllowance[]>(`/api/v1/office/leave/employees/${employeeId}/special-leave`, signal),
});

/** A change to an employee's leave changes their figures, ledgers and what their requests may take: all leave and approval reads again. */
function useLeaveCommand<T>(send: (input: T) => Promise<unknown>, onDone: () => void) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: send,
    onSuccess: () => onDone(),
    onSettled: () => Promise.all([client.invalidateQueries({ queryKey: leaveKeys.all }), client.invalidateQueries({ queryKey: ['approval'] })]),
  });
}

/** Adds annual leave days (positive, never expiring) or removes them (negative, the soonest to expire first), with a reason the ledger keeps. */
export const useAdjustLeave = (employeeId: string, onDone: () => void) =>
  useLeaveCommand((body: { days: number; reason: string }) => sendCommand(`${annualBase(employeeId)}/adjustments`, 'POST', body), onDone);

/** Grants whole days of a special leave granted ahead or by quota (positive), or removes them (negative). */
export const useChangeSpecialLeave = (employeeId: string, onDone: () => void) =>
  useLeaveCommand((body: { leaveTypeId: string; days: number; expiryDate?: string; reason: string }) =>
    sendCommand(`/api/v1/office/leave/employees/${employeeId}/special-leave/changes`, 'POST', body), onDone);

export type GrantChange = { kind: 'revoke'; days?: number; reason: string } | { kind: 'expiry'; expiryDate?: string; reason: string };

/** Takes back days from one special leave grant (all that is left without days), or moves what is left to a new expiry. */
export const useChangeGrant = (employeeId: string, allowanceId: string, grantId: string, onDone: () => void) => {
  const base = `/api/v1/office/leave/employees/${employeeId}/special-leave/${allowanceId}/grants/${grantId}`;
  return useLeaveCommand((change: GrantChange) => change.kind === 'revoke'
    ? sendCommand(`${base}/revocation`, 'POST', { days: change.days, reason: change.reason })
    : sendCommand(`${base}/expiry`, 'PUT', { expiryDate: change.expiryDate, reason: change.reason }), onDone);
};

/** Monthly grants carry a yyyy-MM period, annual ones end in -anniversary; additions have none. */
export function periodLabel(period?: string | null): string {
  if (!period) return '조정 추가분';
  if (period.endsWith('-anniversary')) return `${period.slice(0, 4)}년 연차`;
  const match = /^(\d{4})-(\d{2})$/.exec(period);
  return match ? `${match[1]}년 ${Number(match[2])}월 월차` : period;
}
