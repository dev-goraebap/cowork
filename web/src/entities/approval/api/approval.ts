import { queryOptions } from '@tanstack/react-query';
import { getJson, type components } from '@/shared/api';

type Schemas = components['schemas'];
type WithRequired<T, K extends keyof T> = T & { [P in K]-?: NonNullable<T[P]> };

export type ApprovalPerson = Schemas['Person'];
export type Approver = Schemas['Approver'];
/** One evidence file of a request. */
export type RequestAttachment = WithRequired<Schemas['AttachedFile'], 'id' | 'filename' | 'contentType' | 'size'>;
export type ApprovalRequest = Omit<WithRequired<Schemas['Request'], 'id' | 'kind' | 'status' | 'approvers'>, 'attachments'>
  & { attachments: RequestAttachment[] };
export type ApprovalStatus = ApprovalRequest['status'];
/** A slice of a request list, newest first unless asked otherwise; nextCursor reads the next one. */
export type ApprovalSlice = { items: ApprovalRequest[]; nextCursor?: string | null };

/**
 * Every approval read lives under ['approval']. The pages that read a list extend this prefix; commands on any kind
 * invalidate it as a whole.
 */
export const approvalKeys = { all: ['approval'] as const };

/** One request with its line, each approver's decision, its detail and its evidence. */
export const requestOptions = (id: string) => queryOptions({
  queryKey: [...approvalKeys.all, 'request', id],
  queryFn: ({ signal }) => getJson<ApprovalRequest>(`/api/v1/office/approval/requests/${id}`, signal),
});

/** Only the count of requests waiting for the member's decision, for the 받은 결재 tab. */
export const awaitingCountOptions = () => queryOptions({
  queryKey: [...approvalKeys.all, 'inbox', 'count'],
  queryFn: async ({ signal }) => (await getJson<{ count: number }>('/api/v1/office/approval/inbox/count', signal)).count,
});

export type ApprovalRoles = { approver: boolean; copyRecipient: boolean };

/**
 * Whether requests reach the member as an approver and whether they receive copies, which order the approvals tabs.
 * It changes only when an administrator edits lines or recipients, so it is read once in a while.
 */
export const approvalRolesOptions = () => queryOptions({
  queryKey: [...approvalKeys.all, 'roles'],
  queryFn: ({ signal }) => getJson<ApprovalRoles>('/api/v1/office/approval/roles', signal),
});

/** A short-lived address for one evidence file; download asks the browser to save it instead of showing it. */
export const attachmentLink = async (requestId: string, attachmentId: string, download = false) =>
  (await getJson<{ url: string }>(`/api/v1/office/approval/requests/${requestId}/attachments/${attachmentId}${download ? '?download=true' : ''}`)).url;
