import { infiniteQueryOptions, keepPreviousData } from '@tanstack/react-query';
import { approvalKeys, type ApprovalSlice } from './approval';
import { getJson } from '@/shared/api';
export type ApprovalsTab = 'received' | 'sent' | 'copies';
export type ApprovalsListing = {
  q?: string; kind: string[]; status: string[]; period?: 'week' | 'month' | 'year'; direction?: 'asc';
};

export const PAGE_SIZE = 20;

const paths: Record<ApprovalsTab, string> = {
  received: '/api/v1/office/approval/received', sent: '/api/v1/office/approval/sent', copies: '/api/v1/office/approval/copies',
};
const kinds: Record<string, string> = { leave: 'LEAVE', overtime: 'OVERTIME' };
const statuses: Record<string, string> = { review: 'IN_REVIEW', approved: 'APPROVED', rejected: 'REJECTED', cancelled: 'CANCELLED' };
/** The API's names for the chosen values, those it knows. */
const named = (values: string[], names: Record<string, string>) => values.flatMap(each => names[each] ?? []).join(',');

function params(listing: ApprovalsListing, cursor?: string): URLSearchParams {
  const query = new URLSearchParams({ size: String(PAGE_SIZE) });
  if (listing.q) query.set('q', listing.q);
  if (named(listing.kind, kinds)) query.set('kind', named(listing.kind, kinds));
  // Waiting with other statuses lists either, as the server reads them together.
  if (listing.status.includes('waiting')) query.set('waiting', 'true');
  if (named(listing.status, statuses)) query.set('status', named(listing.status, statuses));
  if (listing.period) query.set('period', listing.period.toUpperCase());
  if (listing.direction) query.set('direction', listing.direction.toUpperCase());
  if (cursor) query.set('cursor', cursor);
  return query;
}

/**
 * A tab's requests matching the listing, a slice at a time, newest first unless asked otherwise: those that reached the
 * member as an approver, the member's own, or every other member's request for people copied on all.
 */
export const approvalsOptions = (tab: ApprovalsTab, listing: ApprovalsListing) => infiniteQueryOptions({
  queryKey: [...approvalKeys.all, tab, listing],
  queryFn: ({ pageParam, signal }) => getJson<ApprovalSlice>(`${paths[tab]}?${params(listing, pageParam)}`, signal),
  initialPageParam: undefined as string | undefined,
  getNextPageParam: last => last.nextCursor ?? undefined,
  placeholderData: keepPreviousData,
});
