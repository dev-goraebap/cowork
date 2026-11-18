import { useNavigate } from '@tanstack/react-router';
import { useEffect, type ReactNode } from 'react';
import { ToneBadge } from '@/entities/approval';
import { inAppLink, kindOf, targetOf, useReadNotification, type NoticeTarget, type NotificationItem } from '@/entities/notification';
import { eventHref } from '@/entities/calendar';
import { requestHref } from '@/entities/leave';
import { workItemHref } from '@/entities/work-item';
import { Button } from '@/shared/ui/button';
import { SplitColumn, SplitDetail } from '@/shared/ui/layout/split-view';
import { useAnnouncementPanel } from '@/widgets/announcement-view';
import { useEventPanel } from '@/widgets/event-view';
import { useRequestPanel } from '@/widgets/request-detail';
import { WorkItemDetail } from '@/widgets/work-item-detail';
import { momentOf } from '../model/format';

/**
 * What a notice's detail shows, for the place it is shown in to frame: its title (the phone page's last crumb), the menu
 * for after it, and its content, which either lays itself out (column false: a notice at a reading measure, a work item)
 * or is sections for a settings-page column under the title and description.
 */
export type NoticeView = {
  title: string; description?: string; menu?: ReactNode; content: ReactNode; column: boolean;
  /** What it is, over it in the inbox (결재, 공지사항, HOH-12), and its own page, the way out of the inbox to it. */
  label: string; href?: string;
};
type Frame = (view: NoticeView) => ReactNode;

/** The notice itself: its title, words, when it came and its kind; its link, when it has one in the app, is its page. */
function NoticeItself({ item, frame }: { item: NotificationItem; frame: Frame }) {
  const navigate = useNavigate();
  const kind = kindOf(item.kind);
  const href = inAppLink(item.link);
  const openLabel = item.kind === 'MEETING_READY' ? '회의록 열기' : undefined;
  return <>{frame({
    title: item.title, description: momentOf(item.createdAt, Date.now()), column: true, label: kind.label, href,
    content: <div className="flex flex-col items-start gap-4">
      <ToneBadge label={kind.label} tone={kind.color} />
      {item.message ? <p className="text-sm whitespace-pre-wrap">{item.message}</p> : null}
      {openLabel && href ? <Button variant="secondary" onClick={() => void navigate({ href })}>{openLabel}</Button> : null}
    </div>,
  })}</>;
}

function RequestNotice({ id, item, frame }: { id: string; item: NotificationItem; frame: Frame }) {
  const panel = useRequestPanel(id);
  if (panel.isMissing) return <NoticeItself item={item} frame={frame} />;
  return <>{frame({ title: panel.title, description: panel.summary, content: panel.body, column: true, label: '결재', href: requestHref(id) })}</>;
}

function AnnouncementNotice({ id, item, frame }: { id: string; item: NotificationItem; frame: Frame }) {
  const navigate = useNavigate();
  const panel = useAnnouncementPanel(id, { onDeleted: () => void navigate({ href: '/inbox', replace: true }) });
  if (panel.isMissing) return <NoticeItself item={item} frame={frame} />;
  return <>{frame({ title: panel.title, menu: panel.menu, content: panel.body, column: false, label: '공지사항', href: `/office/announcements/${id}` })}</>;
}

function EventNotice({ id, occurrence, item, frame }: { id: string; occurrence?: string; item: NotificationItem; frame: Frame }) {
  const navigate = useNavigate();
  const panel = useEventPanel(id, { occurrence, onDeleted: () => void navigate({ href: '/inbox', replace: true }) });
  if (panel.isMissing) return <NoticeItself item={item} frame={frame} />;
  return <>{frame({
    title: panel.title, menu: panel.menu, content: panel.body, column: false, label: '일정', href: eventHref({ id, occurrence }),
  })}</>;
}

function WorkItemNotice({ target, frame }: { target: Extract<NoticeTarget, { kind: 'work-item' }>; frame: Frame }) {
  const navigate = useNavigate();
  return <>{frame({
    title: `${target.projectKey}-${target.number}`, column: false, label: `${target.projectKey}-${target.number}`, href: workItemHref(target),
    content: <WorkItemDetail projectKey={target.projectKey} number={target.number} hrefOf={workItemHref}
      onDeleted={() => void navigate({ href: '/inbox', replace: true })} />,
  })}</>;
}

/**
 * A notice opened: the thing it points to shown in place (a request with its actions, an announcement's content, an
 * event, a work item), or, for anything else or a target that is gone, the notice itself. Opening it marks it read.
 * frame lays the view out where it is shown (the inbox's detail, a phone's page).
 */
export function NoticeDetail({ item, frame }: { item: NotificationItem; frame: Frame }) {
  const { mutate: read } = useReadNotification();
  const unread = !item.readAt;
  useEffect(() => { if (unread) read(item.id); }, [unread, item.id, read]);
  const target = targetOf(item.link);
  switch (target?.kind) {
    case 'request': return <RequestNotice key={target.id} id={target.id} item={item} frame={frame} />;
    case 'announcement': return <AnnouncementNotice key={target.id} id={target.id} item={item} frame={frame} />;
    case 'event': return <EventNotice key={target.id} id={target.id} occurrence={target.occurrence} item={item} frame={frame} />;
    case 'work-item': return <WorkItemNotice key={`${target.projectKey}-${target.number}`} target={target} frame={frame} />;
    default: return <NoticeItself item={item} frame={frame} />;
  }
}

/**
 * A view laid out in the inbox's detail under its bar (what it is, its menu, the way to its page): sections in a
 * settings-page column under the title, or as it lays itself out.
 */
export const inboxFrame: Frame = view => <SplitDetail label={view.label} title={view.title} href={view.href} menu={view.menu}>
  {view.column ? <SplitColumn title={view.title} description={view.description}>{view.content}</SplitColumn> : view.content}
</SplitDetail>;
