import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { PersonAvatar, RequestAttachments, type ApprovalRequest } from '@/entities/approval';
import { leaveEventText, slotLabels, type LeaveSlot, type LeaveView } from '@/entities/leave';
import { durationText, type OvertimeView } from '@/entities/overtime';
import { projectsOptions } from '@/entities/project';
import { SettingsSection } from '@/shared/ui/settings';
import { dayText, momentText } from '../model/moment';
import { DetailRow } from './DetailRow';

const hm = (time?: string) => time?.slice(0, 5) ?? '';

/** The project overtime is for, by its id, among the projects members read; one not found reads as unknown. */
function ProjectName({ projectId }: { projectId: string }) {
  const projects = useQuery(projectsOptions());
  if (projects.isPending) return <span className="text-muted-foreground">…</span>;
  const project = projects.data?.find(each => each.id === projectId);
  return project ? <span>{project.name}</span> : <span className="text-muted-foreground">알 수 없는 프로젝트</span>;
}

/**
 * Everything the request says, one fact to a row: who, when, what kind, which days and hours, why, and its evidence.
 * Overtime lists its days in a section of its own, so here it gives only the kind, how many days and the time counted.
 */
export function RequestFacts({ request, leave, overtime }: { request: ApprovalRequest; leave?: LeaveView; overtime?: OvertimeView }) {
  const period = leave?.startDate
    ? leave.startDate === leave.endDate || !leave.endDate ? dayText(leave.startDate) : `${dayText(leave.startDate)} ~ ${dayText(leave.endDate)}`
    : undefined;
  const rows: { label: string; end?: ReactNode; description?: ReactNode }[] = [
    { label: '신청자', end: <span className="flex items-center gap-2">
      <PersonAvatar id={request.requester?.id} name={request.requester?.name} size={24} />
      <span>{request.requester?.name ?? '신청자'}</span>
      <span className="text-xs text-muted-foreground">{request.requester?.departmentName ?? '부서 미배정'}</span>
    </span> },
    { label: '신청일시', end: momentText(request.submittedAt) },
  ];
  if (leave) {
    rows.push({ label: '휴가 종류', end: leave.typeName ?? '연차' });
    rows.push({ label: '구분', end: slotLabels[leave.slot as LeaveSlot] ?? leave.slot ?? '-' });
    if (period) rows.push({ label: '기간', end: period });
    if (leave.startTime && leave.endTime) rows.push({ label: '시간', end: `${hm(leave.startTime)} ~ ${hm(leave.endTime)}` });
    if (leave.days != null) rows.push({ label: '사용 일수', end: `${Number(leave.days)}일` });
    const event = leaveEventText(leave);
    if (event) rows.push({ label: '사건', end: event });
    rows.push(leave.reason
      ? { label: '사유', description: <span className="whitespace-pre-wrap text-foreground">{leave.reason}</span> }
      : { label: '사유', end: <span className="text-muted-foreground">-</span> });
  }
  if (overtime) {
    rows.push({ label: '종류', end: '연장근무' });
    rows.push({ label: '날짜 수', end: `${overtime.days.length}일` });
    rows.push({ label: '인정 시간', end: durationText(overtime.recognizedMinutes) });
    if (overtime.projectId) rows.push({ label: '프로젝트', end: <ProjectName projectId={overtime.projectId} /> });
  }
  if (request.attachments.length > 0) rows.push({ label: '증빙', description: <RequestAttachments requestId={request.id} attachments={request.attachments} /> });
  return <SettingsSection title="신청 정보">
    {rows.map(row => <DetailRow key={row.label} label={row.label} description={row.description} end={row.end} />)}
  </SettingsSection>;
}
