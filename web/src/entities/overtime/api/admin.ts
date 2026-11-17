import { infiniteQueryOptions, keepPreviousData } from '@tanstack/react-query';
import { getJson, type components } from '@/shared/api';
import type { OvertimeView } from './overtime';
import { overtimeKeys } from './overtime';

type Schemas = components['schemas'];
type WithRequired<T, K extends keyof T> = T & { [P in K]-?: NonNullable<T[P]> };

/** One member's overtime record in 오피스 관리's list: who, the days worked and the time counted, where it stands. */
export type OvertimeRequestItem = WithRequired<Omit<Schemas['OvertimeRequestItem'], 'overtime'>,
  'id' | 'requesterId' | 'status' | 'currentStep' | 'approverCount' | 'cancellableByAdmin'> & { overtime?: OvertimeView };
type OvertimeRequestSlice = { items: OvertimeRequestItem[]; total: number; nextCursor?: string };
/** What every member's overtime records are narrowed by: status, the requester's name, a period the days worked touch. */
export type OvertimeRequestListing = { status?: string; q?: string; from?: string; to?: string };

/** Every member's overtime records, newest first, a slice at a time with how many match in all (client/'s overtime-requests). */
export const overtimeRequestsOptions = (listing: OvertimeRequestListing) => infiniteQueryOptions({
  queryKey: [...overtimeKeys.all, 'admin', 'requests', listing],
  queryFn: ({ pageParam, signal }) => {
    const params = new URLSearchParams({ size: '20' });
    for (const [key, value] of Object.entries(listing)) if (value) params.set(key, value);
    if (pageParam) params.set('cursor', pageParam);
    return getJson<OvertimeRequestSlice>(`/api/v1/office/overtime/requests?${params}`, signal);
  },
  initialPageParam: undefined as string | undefined,
  getNextPageParam: last => last.nextCursor ?? undefined,
  placeholderData: keepPreviousData,
});
