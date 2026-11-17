import type { ApprovalRequest } from '@/entities/approval';
import { leaveEventText, leaveOf, leavePeriodText } from '@/entities/leave';
import { durationText, overtimeDatesText, overtimeOf } from '@/entities/overtime';

/** What a request asks for by name: the leave's type, or 연장근무. */
export function requestKindName(request: Pick<ApprovalRequest, 'kind' | 'detail'>): string {
  if (overtimeOf(request)) return '연장근무';
  return leaveOf(request)?.typeName ?? '휴가';
}

/** What a request asks for in a line, so a decision names it: 연차 · 2026-10-08 오후 반차, 연장근무 · 10월 7일. */
export function requestSummary(request: ApprovalRequest): string {
  const leave = leaveOf(request);
  if (leave) return `${leave.typeName ?? '휴가'} · ${leavePeriodText(leave)}`;
  const overtime = overtimeOf(request);
  if (overtime) return `연장근무 · ${overtimeDatesText(overtime)}`;
  return '신청';
}

export type DecisionFact = { label: string; value: string };

/**
 * What a decision should not skip, as rows to read before confirming: the kind, its dates, the days or hours it takes,
 * the reason and how much evidence came with it. A missing reason or no evidence is said so, not left out, since that
 * is itself worth knowing before approving.
 */
export function decisionFacts(request: Pick<ApprovalRequest, 'kind' | 'detail' | 'attachments'>): DecisionFact[] {
  const facts: DecisionFact[] = [];
  const leave = leaveOf(request);
  const overtime = overtimeOf(request);
  if (leave) {
    facts.push({ label: '종류', value: leave.typeName ?? '연차' }, { label: '기간', value: leavePeriodText(leave) });
    if (leave.days != null) facts.push({ label: '일수', value: `${Number(leave.days)}일` });
    const event = leaveEventText(leave);
    if (event) facts.push({ label: '사건', value: event });
    facts.push({ label: '사유', value: leave.reason?.trim() || '적지 않음' });
  } else if (overtime) {
    facts.push(
      { label: '종류', value: '연장근무' },
      { label: '날짜', value: overtimeDatesText(overtime) },
      { label: '인정 시간', value: durationText(overtime.recognizedMinutes) },
    );
    const reasons = [...new Set(overtime.days.map(day => day.reason?.trim()).filter((reason): reason is string => !!reason))];
    facts.push({ label: '사유', value: reasons.join(' · ') || '적지 않음' });
  }
  const files = request.attachments?.length ?? 0;
  facts.push({ label: '증빙', value: files > 0 ? `${files}개` : '없음' });
  return facts;
}
