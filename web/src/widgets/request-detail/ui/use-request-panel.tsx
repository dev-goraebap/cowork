import { useQuery } from '@tanstack/react-query';
import { useOpenPanel } from '@/shared/lib/panel';
import { useEffect, useState, type ReactNode } from 'react';
import { requestOptions, useApprovalReads } from '@/entities/approval';
import { leaveOf, newRequestHref } from '@/entities/leave';
import { useReadRequestNotifications } from '@/entities/notification';
import { CancelRequestDialog, cancelLabel, DecisionDialog, requestKindName, requestSummary, type Verdict } from '@/features/approval-actions';
import { isNotFound } from '@/shared/api';
import { sessionOptions } from '@/shared/auth';
import { Button } from '@/shared/ui/button';
import { PageState } from '@/shared/ui/page-state';
import { ResultMark } from '@/shared/ui/result-mark';
import { RequestDetail } from './RequestDetail';

export type RequestPanel = {
  /** Whose request and what it asks for: 내 연차 신청, 김고래 님의 연장근무 신청; 결재 until it is read. */
  title: string;
  /** What it asks for in a line, once read. */
  summary?: string;
  /** The request laid out in full with the actions the member may take, and their dialogs; or why it cannot be shown. */
  body: ReactNode;
  /** Whether it is gone (or never was), so a place with something else to show can show that instead. */
  isMissing: boolean;
};

/**
 * One request ready to be shown wherever it opens (its own page, 결재함's and 받은 알림's detail): its title and summary,
 * and its body, laid out as every request is (RequestDetail), with the actions the member may take in its summary: the
 * approver whose turn it is approves or rejects; the requester withdraws or cancels, and asks again for leave that was
 * rejected or withdrawn, the form filled with what it asked. errorAction is offered when it cannot be read.
 */
export function useRequestPanel(id: string, { errorAction }: { errorAction?: ReactNode } = {}): RequestPanel {
  const openPanel = useOpenPanel();
  const session = useQuery(sessionOptions());
  const request = useQuery(requestOptions(id));
  const [deciding, setDeciding] = useState<Verdict | null>(null);
  const [decision, setDecision] = useState<{ id: string; verdict: Verdict }>();
  const [cancelling, setCancelling] = useState(false);
  const data = request.data;
  const { mutate: readNotices } = useReadRequestNotifications();
  const requestId = data?.id;
  const currentStep = data?.currentStep;
  useEffect(() => {
    if (requestId) readNotices(requestId);
  }, [requestId, currentStep, readNotices]);
  const { markOpened } = useApprovalReads();
  useEffect(() => {
    if (data?.decidable) markOpened(data.id, data.currentStep ?? 0);
  }, [data, markOpened]);
  const leave = data && leaveOf(data);
  const mine = !!data && data.requester?.id === session.data?.id;
  const title = !data ? '결재' : mine ? `내 ${requestKindName(data)} 신청` : `${data.requester?.name ?? '신청자'} 님의 ${requestKindName(data)} 신청`;
  // The server names annual leave 연차 whatever its type; any other leave is special and opens at its type.
  const askAgain = leave && mine && (data.status === 'REJECTED' || data.status === 'CANCELLED') ? () => openPanel(newRequestHref({
    kind: leave.typeName === '연차' ? 'annual' : 'special', type: leave.typeName === '연차' ? undefined : leave.leaveTypeId, from: id,
  }), { surface: 'inherit' }) : undefined;
  const verdict = decision?.id === id ? decision.verdict : undefined;
  const actions = data && (verdict || data.decidable || data.cancellable || askAgain) ? <>
    {verdict ? <span className="flex items-center gap-2" role="status">
      <ResultMark key={id} size="sm" tone={verdict === 'APPROVE' ? 'success' : 'neutral'} celebrates={verdict === 'APPROVE'} />
      <span className="text-xs">{verdict === 'APPROVE' ? '승인했습니다' : '반려했습니다'}</span>
    </span> : null}
    {askAgain ? <Button size="sm" onClick={askAgain}>다시 신청</Button> : null}
    {data.decidable && !verdict ? <>
      <Button variant="outline" size="sm" onClick={() => setDeciding('REJECT')}>반려</Button>
      <Button size="sm" onClick={() => setDeciding('APPROVE')}>승인</Button>
    </> : null}
    {data.cancellable ? <Button variant="outline" size="sm" onClick={() => setCancelling(true)}>{cancelLabel(data)}</Button> : null}
  </> : undefined;
  const body = <>
    {request.isError
      ? <PageState kind={isNotFound(request.error) ? 'not-found' : 'error'} title={isNotFound(request.error) ? '신청을 찾을 수 없습니다' : '신청을 불러오지 못했습니다'} description={request.error.message}
        action={errorAction} />
      : data ? <RequestDetail request={data} actions={actions} /> : null}
    <DecisionDialog request={deciding && data ? data : null} verdict={deciding ?? 'APPROVE'} onClose={() => setDeciding(null)}
      onDecided={verdict => setDecision({ id, verdict })} />
    <CancelRequestDialog request={cancelling && data ? data : null} onClose={() => setCancelling(false)} />
  </>;
  return { title, summary: data ? requestSummary(data) : undefined, body, isMissing: request.isError && isNotFound(request.error) };
}
