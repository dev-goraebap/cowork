import type { ApprovalRequest, ApprovalStatus } from '../api/approval';

/** Where a request stands as members read it: 결재 중 with its step, 승인, 반려 or 취소. */
export function statusText(request: Pick<ApprovalRequest, 'status' | 'currentStep' | 'approvers'>): string {
  switch (request.status) {
    case 'IN_REVIEW': return `결재 중 ${request.currentStep ?? 1}/${request.approvers.length}`;
    case 'APPROVED': return '승인';
    case 'REJECTED': return '반려';
    case 'CANCELLED': return '취소';
    default: return request.status;
  }
}

/** The token colour of each status; the colour only repeats what the words say. */
export const statusColors: Record<ApprovalStatus, 'blue' | 'green' | 'red' | 'gray'> = {
  IN_REVIEW: 'blue', APPROVED: 'green', REJECTED: 'red', CANCELLED: 'gray',
};

/** Statuses alone, for a list that carries no line (a month of overtime). */
export const statusLabels: Record<ApprovalStatus, string> = { IN_REVIEW: '결재 중', APPROVED: '승인', REJECTED: '반려', CANCELLED: '취소' };

/** Where a request made outside the app came from, as the server marks it. */
export const DISCORD_ORIGIN = 'DISCORD';

/** The mark for a request brought in from elsewhere; undefined for one made in the app. */
export const originLabel = (origin?: string | null): string | undefined =>
  (origin ? (origin === DISCORD_ORIGIN ? '디스코드 이관' : '이관') : undefined);

/**
 * The line the requester was offered, when they sent another: its approvers in order, or that nobody was offered and
 * the request would have been approved at once. Nothing when they kept the line.
 */
export function suggestedLineText(request: ApprovalRequest): string | null {
  const suggested = request.suggestedApprovers;
  if (!suggested) return null;
  return suggested.length === 0 ? '기본 결재선: 없음(바로 승인)' : `기본 결재선: ${suggested.map(person => person.name ?? '알 수 없음').join(' → ')}`;
}

/** Who a request in review waits for now (its current step counts from 1); nobody once it is decided or withdrawn. */
export function waitingApprover(request: Pick<ApprovalRequest, 'status' | 'currentStep' | 'approvers'>) {
  if (request.status !== 'IN_REVIEW' || !request.currentStep) return undefined;
  return request.approvers[request.currentStep - 1];
}

export type ApproverState = 'approved' | 'rejected' | 'current' | 'upcoming' | 'skipped';
export const approverStateLabels: Record<ApproverState, string> = {
  approved: '승인', rejected: '반려', current: '결재 대기', upcoming: '예정', skipped: '진행되지 않음',
};

/** How one approver on the line stands: decided, deciding now, still to come, or passed over once the request ended. */
export function approverState(request: Pick<ApprovalRequest, 'status' | 'currentStep'>, index: number, decision?: string): ApproverState {
  if (decision === 'APPROVED') return 'approved';
  if (decision === 'REJECTED') return 'rejected';
  if (request.status !== 'IN_REVIEW') return 'skipped';
  return request.currentStep === index + 1 ? 'current' : 'upcoming';
}
