import { keepPreviousData, queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { getJson, sendCommand, type components } from '@/shared/api';
import { approvalKeys, type ApprovalRequest } from './approval';

/*
 * 오피스 관리's reads and writes of approval (client/'s approval-lines and admin cancellation): each department's line by
 * category, the line a member's request would start with, who is copied on every request, one employee's requests, and
 * an administrator closing a request. Every read sits under ['approval'], so a change reads them all again.
 */

type Schemas = components['schemas'];
type WithRequired<T, K extends keyof T> = T & { [P in K]-?: NonNullable<T[P]> };

export type LinePerson = WithRequired<Schemas['Person'], 'id'>;
export type LineTemplate = WithRequired<Schemas['Template'], 'departmentId' | 'category'> & { approvers: LinePerson[] };
export type LinePreview = WithRequired<Schemas['LinePreview'], 'category' | 'source'> & { approvers: LinePerson[] };
export type RequestPage = { items: ApprovalRequest[]; total: number };

export const CANCEL_REASON_MAX = 1000;
export const EMPLOYEE_REQUESTS_PAGE = 5;
const settingsKey = [...approvalKeys.all, 'settings'] as const;

/** Every department's lines by category. */
export const templatesOptions = () => queryOptions({
  queryKey: [...settingsKey, 'templates'],
  queryFn: ({ signal }) => getJson<LineTemplate[]>('/api/v1/office/approval/templates', signal),
});

/** Who is copied on every request. */
export const ccRecipientsOptions = () => queryOptions({
  queryKey: [...settingsKey, 'cc-recipients'],
  queryFn: ({ signal }) => getJson<LinePerson[]>('/api/v1/office/approval/cc-recipients', signal),
});

/** The line an employee's request of the category would start with, and where it came from; read fresh as lines change. */
export const linePreviewOptions = (employeeId: string, category: string) => queryOptions({
  queryKey: [...settingsKey, 'preview', employeeId, category],
  queryFn: ({ signal }) => getJson<LinePreview>(`/api/v1/office/approval/line-preview?${new URLSearchParams({ employeeId, category })}`, signal),
  staleTime: 0,
});

/** One page of an employee's requests of a kind, newest first, as an administrator sees them. */
export const employeeRequestsOptions = (employeeId: string, kind: string, page: number) => queryOptions({
  queryKey: [...approvalKeys.all, 'employee', employeeId, kind, page],
  queryFn: ({ signal }) => getJson<RequestPage>(`/api/v1/office/approval/employees/${employeeId}/requests?${new URLSearchParams({
    kind, page: String(page), size: String(EMPLOYEE_REQUESTS_PAGE),
  })}`, signal),
  placeholderData: keepPreviousData,
});

/** Lines, copies and cancellations change what members are offered and see: every approval and leave read again. */
function useApprovalAdmin<T>(send: (input: T) => Promise<unknown>, onDone?: () => void) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: send,
    onSuccess: () => onDone?.(),
    onSettled: () => Promise.all([
      client.invalidateQueries({ queryKey: approvalKeys.all }),
      client.invalidateQueries({ queryKey: ['leave'] }),
      client.invalidateQueries({ queryKey: ['overtime'] }),
    ]),
  });
}

/** Sets who approves a department's requests of the category in order (approverIds), or removes the line (null). */
export const useSaveTemplate = (departmentId: string, category: string, onDone: () => void) =>
  useApprovalAdmin((approverIds: string[] | null) => approverIds
    ? sendCommand(`/api/v1/office/approval/templates/${departmentId}/${category}`, 'PUT', { approverIds })
    : sendCommand(`/api/v1/office/approval/templates/${departmentId}/${category}`, 'DELETE'), onDone);

export const useAddCcRecipient = () => useApprovalAdmin((employeeId: string) => sendCommand('/api/v1/office/approval/cc-recipients', 'POST', { employeeId }));
export const useRemoveCcRecipient = (onDone: () => void) =>
  useApprovalAdmin((employeeId: string) => sendCommand(`/api/v1/office/approval/cc-recipients/${employeeId}`, 'DELETE'), onDone);

/**
 * An administrator closing a leave or overtime request with a reason the requester reads: one in review closes, an
 * approved one is undone (its leave given back, its overtime taken out of the totals).
 */
export const useCancelByAdmin = (onDone: () => void) =>
  useApprovalAdmin(({ id, reason }: { id: string; reason: string }) =>
    sendCommand(`/api/v1/office/approval/requests/${id}/admin-cancellation`, 'POST', { reason }), onDone);
