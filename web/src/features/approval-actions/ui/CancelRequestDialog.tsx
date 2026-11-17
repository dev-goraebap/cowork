import type { ApprovalRequest } from '@/entities/approval';
import { overtimeOf } from '@/entities/overtime';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { useCancelRequest } from '../api/actions';

/** What withdrawing or cancelling a request is called: 회수 in review, 휴가 취소 or 연장근무 취소 once approved. */
export const cancelLabel = (request: ApprovalRequest) =>
  (request.status === 'APPROVED' ? (overtimeOf(request) ? '연장근무 취소' : '휴가 취소') : '회수');

/**
 * Confirms withdrawing a request in review, or cancelling an approved one: leave returns the days it held, overtime
 * not yet begun is simply called off.
 */
export function CancelRequestDialog({ request, onClose }: { request: ApprovalRequest | null; onClose: () => void }) {
  const cancel = useCancelRequest(onClose);
  const approved = request?.status === 'APPROVED';
  const overtime = !!request && !!overtimeOf(request);
  const description = approved
    ? (overtime ? '시작하기 전인 연장근무를 취소합니다. 다시 하려면 새로 신청합니다.' : '승인된 휴가를 취소하면 사용한 연차가 잔여로 돌아갑니다.')
    : '결재 중인 신청을 회수합니다.';
  return <ConfirmDialog open={!!request} onOpenChange={open => { if (!open && !cancel.isPending) { cancel.reset(); onClose(); } }}
    title={approved ? (overtime ? '승인된 연장근무를 취소할까요?' : '승인된 휴가를 취소할까요?') : '신청을 회수할까요?'}
    description={cancel.error?.message ?? description}
    action={{ label: request ? cancelLabel(request) : '회수', isPending: cancel.isPending, onAction: () => { if (request) cancel.mutate(request.id); } }} />;
}
