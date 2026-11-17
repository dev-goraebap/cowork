import { infiniteQueryOptions, keepPreviousData, queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { getJson, sendCommand, sendJson, type components } from '@/shared/api';

type Schemas = components['schemas'];
type Required<T, K extends keyof T> = T & { [P in K]-?: NonNullable<T[P]> };

export type ReportDue = Required<Schemas['ReportDue'], 'day' | 'at'>;
export type WeeklyReportEditor = Required<Omit<Schemas['WeeklyReportEditor'], 'due'>, 'weekStart' | 'state' | 'prefilled' | 'editable'>
  & { due?: ReportDue | null; fileOwnerId?: string | null };
export type WeeklyReportRevision = Required<Schemas['WeeklyReportRevision'], 'revisedAt'>;
export type WeeklyReportDetail = Required<Omit<Schemas['WeeklyReportDetail'], 'revisions'>,
  'id' | 'weekStart' | 'authorId' | 'state' | 'editable' | 'confirmable'> & { revisions: WeeklyReportRevision[] };
export type WeeklyReportRow = Required<Schemas['WeeklyReportRow'], 'id' | 'authorId' | 'weekStart' | 'state' | 'revisions' | 'mine'>;
export type WeeklyReportDepartment = { id: string; name: string };
export type WeeklyReportList = { items: WeeklyReportRow[]; nextOffset?: number | null; departments: WeeklyReportDepartment[]; thisWeek: string };
/** The list's conditions as the API takes them; empty ones are left out. */
export type WeeklyReportListing = {
  week?: string; department?: string; state?: string; q?: string; sort?: 'WEEK' | 'NAME' | 'DEPARTMENT' | 'SUBMITTED'; direction?: 'ASC' | 'DESC';
};
/** The three parts, and week (its Monday) to move the report to another week. */
export type SaveWeeklyReport = { thisWeek: string; nextWeek: string; note: string; submit: boolean; week?: string; uploads?: string[] };

export const weeklyReportKeys = { all: ['weekly-reports'] as const };

/** The reports the member sees over every week, newest week first unless sorted, read a page at a time. */
export const weeklyReportListOptions = (listing: WeeklyReportListing) => infiniteQueryOptions({
  queryKey: [...weeklyReportKeys.all, 'list', listing],
  queryFn: ({ pageParam, signal }) => {
    const params = new URLSearchParams(Object.entries(listing).filter(([, value]) => !!value) as [string, string][]);
    if (pageParam) params.set('offset', String(pageParam));
    return getJson<WeeklyReportList>(`/api/v1/office/weekly-reports?${params}`, signal);
  },
  initialPageParam: 0,
  getNextPageParam: last => last.nextOffset ?? undefined,
  placeholderData: keepPreviousData,
});

/** The member's report of the week (its Monday) to write, or what to start it from. */
export const weeklyReportEditorOptions = (weekStart: string) => queryOptions({
  queryKey: [...weeklyReportKeys.all, 'mine', weekStart],
  queryFn: ({ signal }) => getJson<WeeklyReportEditor>(`/api/v1/office/weekly-reports/mine/${weekStart}`, signal),
});

export const weeklyReportOptions = (id: string) => queryOptions({
  queryKey: [...weeklyReportKeys.all, 'detail', id],
  queryFn: ({ signal }) => getJson<WeeklyReportDetail>(`/api/v1/office/weekly-reports/${id}`, signal),
});

/** A report owns files across current text and its revision history. */
export const weeklyReportFileLinkOptions = (id: string) => (fileId: string, download = false) => queryOptions({
  queryKey: [...weeklyReportKeys.all, 'file', id, fileId, download ? 'download' : 'view'],
  queryFn: ({ signal }) => getJson<{ url: string }>(`/api/v1/office/weekly-reports/${id}/files/${fileId}${download ? '?download=true' : ''}`, signal),
  staleTime: 4 * 60 * 1000,
  gcTime: 4 * 60 * 1000,
});

/** Saves the member's report of the week as a draft or submits it; every weekly report read is read again. */
export function useSaveWeeklyReport(weekStart: string, onSaved?: (saved: { id: string; state: string }) => void) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: SaveWeeklyReport) => sendJson<{ id: string; state: string }>(`/api/v1/office/weekly-reports/mine/${weekStart}`, 'PUT', body),
    onSuccess: saved => onSaved?.(saved),
    onSettled: () => client.invalidateQueries({ queryKey: weeklyReportKeys.all }),
  });
}

/**
 * The writer deletes their report with its revisions. The reads are only marked stale, read again where next shown, so
 * the deleted report's page is not read again (it would answer 404) as the member leaves it.
 */
export function useDeleteWeeklyReport(onDone?: () => void) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sendCommand(`/api/v1/office/weekly-reports/${id}`, 'DELETE'),
    onSuccess: () => onDone?.(),
    onSettled: () => client.invalidateQueries({ queryKey: weeklyReportKeys.all, refetchType: 'none' }),
  });
}

/** The direct lead opened the submitted report: it is confirmed, and its status reads again. */
export function useConfirmWeeklyReport() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sendCommand(`/api/v1/office/weekly-reports/${id}/confirmation`, 'POST'),
    onSettled: () => client.invalidateQueries({ queryKey: weeklyReportKeys.all }),
  });
}
