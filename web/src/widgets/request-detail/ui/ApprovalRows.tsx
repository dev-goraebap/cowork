import { useNavigate } from '@tanstack/react-router';
import { ApprovalStatus, PersonAvatar, useApprovalReads, type ApprovalRequest } from '@/entities/approval';
import { requestKindName } from '@/features/approval-actions';
import { leaveOf, leavePeriodText } from '@/entities/leave';
import { durationText, overtimeDatesText, overtimeOf } from '@/entities/overtime';
import { ClockIcon, UmbrellaIcon } from '@/shared/ui/icon';
import { SplitList, SplitRow } from '@/shared/ui/layout/split-view';
import { LeadIcon } from './LeadIcon';

const dayFormat = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'long', day: 'numeric' });
const yearFormat = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'numeric', day: 'numeric' });

const periodOf = (row: ApprovalRequest) => {
  const leave = leaveOf(row);
  const overtime = overtimeOf(row);
  return leave ? leavePeriodText(leave) : overtime ? overtimeDatesText(overtime) : '';
};
const amountOf = (row: ApprovalRequest) => {
  const leave = leaveOf(row);
  const overtime = overtimeOf(row);
  return leave?.days != null ? `${Number(leave.days)}일` : overtime ? durationText(overtime.recognizedMinutes) : undefined;
};
/** When it was asked: the month and day this year, the whole date another year. */
const askedOf = (row: ApprovalRequest, year: string) => {
  if (!row.submittedAt) return '';
  const date = new Date(row.submittedAt);
  return yearFormat.format(date).startsWith(year) ? dayFormat.format(date) : yearFormat.format(date);
};

/**
 * The approvals as inbox rows, one a request: who asked (or, for the member's own, the kind's icon), what is asked for
 * with its days or hours, the dates (and 내 결재 차례 when the decision is the member's now), where it stands and when
 * it was asked. A row, pressed anywhere, opens the request (hrefOf), the chosen one marked; the requester's avatar opens
 * their profile.
 */
export function ApprovalRows({ items, isOwn, chosen, hrefOf }: {
  items: ApprovalRequest[]; isOwn: boolean; chosen?: string; hrefOf: (id: string) => string;
}) {
  const navigate = useNavigate();
  const { opened } = useApprovalReads();
  const year = String(new Date().getFullYear());
  return <SplitList label="결재">
    {items.map(row => {
      const amount = amountOf(row);
      return <SplitRow key={row.id} onOpen={() => void navigate({ href: hrefOf(row.id) })} isChosen={row.id === chosen}
        isUnread={!!row.decidable && opened[row.id] !== (row.currentStep ?? 0)}
        title={isOwn ? `${requestKindName(row)}${amount ? ` · ${amount}` : ''}` : `${row.requester?.name ?? '신청자'} · ${requestKindName(row)}`}
        description={[periodOf(row), !isOwn ? amount : undefined, row.decidable ? '내 결재 차례' : undefined].filter(Boolean).join(' · ')}
        start={isOwn ? <LeadIcon icon={overtimeOf(row) ? ClockIcon : UmbrellaIcon} /> : <PersonAvatar id={row.requester?.id} name={row.requester?.name} size={32} />}
        end={<span className="flex items-center gap-2">
          <ApprovalStatus request={row} />
          <span className="text-xs text-muted-foreground tabular-nums">{askedOf(row, year)}</span>
        </span>} />;
    })}
  </SplitList>;
}
