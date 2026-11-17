import type { ReactNode } from 'react';
import { ApprovalStatus, waitingApprover, type ApprovalRequest } from '@/entities/approval';
import { leaveOf, leavePeriodText } from '@/entities/leave';
import { durationText, LateMark, OvertimeDayRows, overtimeDatesText, overtimeOf } from '@/entities/overtime';
import { ClockIcon, InboxInIcon, UmbrellaIcon } from '@/shared/ui/icon';
import { SettingsSection } from '@/shared/ui/settings';
import { ApprovalTimeline } from './ApprovalTimeline';
import { DetailRow } from './DetailRow';
import { LeadIcon } from './LeadIcon';
import { RequestFacts } from './RequestFacts';

/**
 * One request laid out in full, as sections of a settings page: a summary of the leave or overtime with its days or
 * hours and where it stands, whose turn it is and whatever the screen lets the viewer do (actions); the request's facts;
 * for overtime its days one by one; and its way through the line. (Who else is off in the same days is not shown: the
 * decision does not turn on it.)
 */
export function RequestDetail({ request, actions }: { request: ApprovalRequest; actions?: ReactNode }) {
  const leave = leaveOf(request);
  const overtime = overtimeOf(request);
  const turn = waitingApprover(request);
  const figure = leave?.days != null ? `${Number(leave.days)}일` : overtime ? durationText(overtime.recognizedMinutes) : undefined;
  return <>
    <SettingsSection title="신청" action={actions ? <div className="flex flex-wrap items-center justify-end gap-2">{actions}</div> : undefined}>
      <DetailRow label={overtime ? '연장근무' : leave?.typeName ?? '휴가'}
        description={leave ? leavePeriodText(leave) : overtime ? overtimeDatesText(overtime) : undefined}
        start={<LeadIcon icon={overtime || (leave?.slot && leave.slot !== 'FULL_DAY') ? ClockIcon : UmbrellaIcon} />}
        end={<>
          {overtime ? <LateMark overtime={overtime} /> : null}
          <ApprovalStatus request={request} />
          {figure ? <span className="font-semibold tabular-nums">{figure}</span> : null}
        </>} />
      {turn ? <DetailRow label={`지금 ${turn.name ?? '결재자'} 님의 결재 차례입니다.`} start={<LeadIcon icon={InboxInIcon} />} /> : null}
    </SettingsSection>
    <RequestFacts request={request} leave={leave} overtime={overtime} />
    {overtime ? <SettingsSection title="날짜별 연장근무">
      <OvertimeDayRows days={overtime.days.map(day => ({ key: day.date, day }))} />
    </SettingsSection> : null}
    <ApprovalTimeline request={request} />
  </>;
}
