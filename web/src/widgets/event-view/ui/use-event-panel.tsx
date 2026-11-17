import { useQuery } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import {
  awayDuring, calendarEventOptions, calendarFeedOptions, calendarFileLinkOptions, describeRule, eventEditHref, newEventHref,
  reminderLabel, REMINDERS, ScopeDialog, useDeleteEvent, useEventReminder, whenText,
} from '@/entities/calendar';
import { eventMeetingsOptions, meetingCreateHref } from '@/entities/meeting';
import { isNotFound } from '@/shared/api';
import { useOpenPanel } from '@/shared/lib/panel';
import { ActionMenu, type MenuAction } from '@/shared/ui/action-menu';
import { Badge } from '@/shared/ui/badge';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import {
  BellIcon, ClockIcon, CopyIcon, MapPinIcon, MeetingIcon, PenSquareIcon, ProjectsIcon, RepeatIcon, Trash2Icon,
} from '@/shared/ui/icon';
import { InfoPill } from '@/shared/ui/info-pill';
import { PageState } from '@/shared/ui/page-state';
import { PersonAvatar } from '@/shared/ui/person';
import { OptionPill, pillVariants } from '@/shared/ui/property-pill';
import { DetailLayout, type DetailSection } from '@/shared/ui/reading';
import { MarkdownRead } from '@/shared/ui/rich-body';

export type EventPanel = {
  /** The event's title; 일정 until it is read or when it cannot be. */
  title: string;
  /** When it is, once read. */
  description?: string;
  /** What one does to the event itself (편집, 복제, 회의록 만들기, 삭제), for after its name. */
  menu?: ReactNode;
  /** The event on the detail page every body has (DetailLayout), and its dialogs; or why it cannot be shown. */
  body: ReactNode;
  /** Whether it is gone (removed, or never was), so a place with something else to show can show that instead. */
  isMissing: boolean;
};

/**
 * One event ready to be shown wherever it opens (its own page, 받은 알림's detail) on the detail page every body has
 * (DetailLayout): its title and text, and as properties when and how it repeats, where, its project, its minutes, the
 * viewer's own reminder, the people in it with who is away then, and who made it; a repeating one as the given
 * occurrence. Whoever may change it edits or deletes it (a repeating one asking which occurrences; onDeleted with its
 * day after), and anyone may copy it into a new event.
 */
export function useEventPanel(id: string, { occurrence, onDeleted }: { occurrence?: string; onDeleted: (day?: string) => void }): EventPanel {
  const openPanel = useOpenPanel();
  const detail = useQuery(calendarEventOptions(id, occurrence));
  const event = detail.data;
  const meetingAt = { eventId: id, occurrence: event?.occurrence ?? occurrence };
  const meetings = useQuery({ ...eventMeetingsOptions(meetingAt), enabled: !!event });
  const day = event?.start.slice(0, 10);
  const feed = useQuery({ ...calendarFeedOptions(day ?? '', day ?? ''), enabled: !!day });
  const reminder = useEventReminder(id);
  const remove = useDeleteEvent();
  const [deleting, setDeleting] = useState(false);

  if (detail.isError) return {
    title: '일정', isMissing: isNotFound(detail.error),
    body: <PageState kind={isNotFound(detail.error) ? 'not-found' : 'error'} title={isNotFound(detail.error) ? '일정을 찾을 수 없습니다' : '일정을 불러오지 못했습니다'} description={detail.error.message} />,
  };
  if (!event) return { title: '일정', body: null, isMissing: false };

  // Who is away on its day, or during its hours, as the calendar counts them.
  const closed = new Set((feed.data?.holidays ?? []).map(holiday => holiday.date));
  const away = event.allDay ? awayDuring(feed.data?.leaves ?? [], closed, event.start.slice(0, 10))
    : awayDuring(feed.data?.leaves ?? [], closed, event.start.slice(0, 10), event.start.slice(11, 16), event.end.slice(11, 16));
  const attendees = [...event.attendees].sort((one, other) => Number(!!other.organizer) - Number(!!one.organizer));
  const leave = () => onDeleted(day);
  const actions: MenuAction[] = [
    ...(event.editable ? [{ label: '편집', isPrimary: true, icon: PenSquareIcon, onSelect: () => openPanel(eventEditHref(event), { surface: 'inherit' }) }] : []),
    { label: '복제', icon: CopyIcon, onSelect: () => openPanel(newEventHref({ copy: event.id, occurrence: event.occurrence }), { surface: 'inherit' }) },
    { label: '회의록 만들기', icon: MeetingIcon, onSelect: () => openPanel(meetingCreateHref(meetingAt), { surface: 'inherit' }) },
    ...(event.editable ? [{ label: '삭제', icon: Trash2Icon, onSelect: () => setDeleting(true) }] : []),
  ];
  const menu = <ActionMenu isInline label="일정 메뉴" title="일정" actions={actions} />;
  const minutes = meetings.data?.meetings ?? (meetings.data?.meeting ? [meetings.data.meeting] : []);
  const sections: DetailSection[] = [
    {
      title: '속성', items: <>
        <InfoPill label="일시" icon={<ClockIcon />}>{whenText(event)}</InfoPill>
        {event.recurrence ? <InfoPill label="반복" icon={<RepeatIcon />}>{describeRule(event.recurrence, (event.occurrence ?? event.start).slice(0, 10))}</InfoPill> : null}
        {event.location ? <InfoPill label="장소" icon={<MapPinIcon />}>{event.location}</InfoPill> : null}
        {event.projectName ? <InfoPill label="프로젝트" icon={<ProjectsIcon />}>{event.projectName}</InfoPill> : null}
        {minutes.map(meeting => <button key={meeting.id} type="button" aria-label={`회의록 ${meeting.title}`} className={pillVariants()}
          onClick={() => openPanel(`/office/meetings/${meeting.id}`, { surface: 'inherit' })}>
          <MeetingIcon />
          <span className="min-w-0 truncate">{meeting.title}</span>
        </button>)}
        {event.attending ? <OptionPill label="내 알림" icon={BellIcon} value={String(event.reminderMinutes ?? 'none')}
          options={REMINDERS.map(item => ({ value: String(item.minutes ?? 'none'), label: reminderLabel(item.minutes, event.allDay), icon: <BellIcon /> }))}
          onChange={value => { if (!reminder.isPending) reminder.mutate(value === 'none' ? null : Number(value)); }} /> : null}
      </>,
    },
    ...(attendees.length > 1 ? [{
      title: `참석자 ${attendees.length}명`, items: <>{attendees.map(person => <InfoPill key={person.employeeId} label={person.name ?? '참석자'}
        icon={<PersonAvatar id={person.employeeId} name={person.name} size={16} isStatic />}>
        {`${person.name ?? '알 수 없음'}${person.organizer ? ' · 만든 사람' : ''}${away.has(person.employeeId) ? ' · 휴가' : ''}`}
      </InfoPill>)}</>,
    }] : []),
    ...(event.organizerName ? [{
      title: '정보', items: <InfoPill label="작성자" icon={<PersonAvatar id={event.organizerId} name={event.organizerName} size={16} isStatic />}>{event.organizerName}</InfoPill>,
    }] : []),
  ];
  const body = <>
    <DetailLayout label={event.title} title={event.title} sections={sections}
      head={event.visibility === 'PERSONAL' || event.changed ? <div className="flex flex-wrap items-center gap-2">
        {event.visibility === 'PERSONAL' ? <Badge variant="secondary">나만 보기</Badge> : null}
        {event.changed ? <Badge variant="secondary">이 일정만 바뀜</Badge> : null}
      </div> : undefined}>
      {event.body?.trim() ? <MarkdownRead value={event.body} linkOf={calendarFileLinkOptions(id)} label="일정 내용" />
        : <p className="text-muted-foreground">적은 내용이 없습니다.</p>}
    </DetailLayout>
    {event.recurrence && event.occurrence
      ? <ScopeDialog isOpen={deleting} isDelete isPending={remove.isPending} error={remove.error} onClose={() => { setDeleting(false); remove.reset(); }}
        onConfirm={scope => remove.mutate({ id: event.id, target: { scope, occurrence: event.occurrence ?? '' } }, { onSuccess: leave })} />
      : <ConfirmDialog open={deleting} onOpenChange={open => { if (!open) { setDeleting(false); remove.reset(); } }}
        title="일정을 삭제할까요?"
        description={remove.error?.message ?? (attendees.length > 1 ? '참석자에게 일정이 취소되었다고 알립니다.' : '삭제한 일정은 되돌릴 수 없습니다.')}
        action={{ label: '삭제', isPending: remove.isPending, onAction: () => remove.mutate({ id: event.id }, { onSuccess: leave }) }} />}
  </>;
  return { title: event.title, description: whenText(event), menu, body, isMissing: false };
}
