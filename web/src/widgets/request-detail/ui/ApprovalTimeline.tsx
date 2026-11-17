import {
  approverState, approverStateLabels, OriginMark, PersonAvatar, suggestedLineText, ToneBadge, type ApprovalRequest, type ApproverState, type Tone,
} from '@/entities/approval';
import { ArchiveIcon, XIcon } from '@/shared/ui/icon';
import { SettingsSection } from '@/shared/ui/settings';
import { momentText } from '../model/moment';
import { DetailRow } from './DetailRow';
import { LeadIcon } from './LeadIcon';

const tones: Record<ApproverState, Tone> = { approved: 'green', rejected: 'red', current: 'blue', upcoming: 'gray', skipped: 'gray' };

/**
 * The request's way through its line, top to bottom: the request, then each approver with how and when they decided,
 * whose turn it is now, who is still to come, and a cancellation when there was one. A line the requester changed says
 * so under the request, with the line they were offered. A request brought in from elsewhere has no line; it says so
 * in place of one, with the original post when there is one.
 */
export function ApprovalTimeline({ request }: { request: ApprovalRequest }) {
  const suggested = suggestedLineText(request);
  return <SettingsSection title="결재 진행">
    <DetailRow label={`${request.requester?.name ?? '신청자'} · 신청`}
      description={<>
        <span>{momentText(request.submittedAt)}</span>
        {suggested ? <span className="text-foreground">결재선을 바꿔 신청했습니다 · {suggested}</span> : null}
      </>}
      start={<PersonAvatar id={request.requester?.id} name={request.requester?.name} size={32} />} />
    {request.origin ? <DetailRow label="결재 없이 옮겨 온 기록"
      description={<>
        <span>앱 밖에서 기록한 것을 승인된 상태로 옮겼습니다</span>
        {request.originLink ? <a href={request.originLink} target="_blank" rel="noreferrer"
          className="w-fit text-foreground underline underline-offset-4 hover:text-muted-foreground">원래 글 보기</a> : null}
      </>}
      start={<LeadIcon icon={ArchiveIcon} />} end={<OriginMark origin={request.origin} />} /> : null}
    {request.approvers.map((approver, index) => {
      const state = approverState(request, index, approver.decision);
      return <DetailRow key={`${approver.id}-${index}`} label={`${approver.name ?? '알 수 없음'} · ${index + 1}차 결재`}
        description={<>
          <span>{approver.departmentName ?? '미배정'}{approver.decidedAt ? ` · ${momentText(approver.decidedAt)}` : ''}</span>
          {approver.reason ? <span className="text-foreground">{approver.reason}</span> : null}
        </>}
        start={<PersonAvatar id={approver.id} name={approver.name} size={32} />}
        end={<ToneBadge label={approverStateLabels[state]} tone={tones[state]} />} />;
    })}
    {request.status === 'CANCELLED' ? <DetailRow label={request.rejectionReason ? '관리자가 취소' : '신청자가 취소'}
      description={<>
        <span>{momentText(request.cancelledAt)}</span>
        {request.rejectionReason ? <span className="text-foreground">{request.rejectionReason}</span> : null}
      </>}
      start={<LeadIcon icon={XIcon} />} end={<ToneBadge label="취소" tone="gray" />} /> : null}
  </SettingsSection>;
}
