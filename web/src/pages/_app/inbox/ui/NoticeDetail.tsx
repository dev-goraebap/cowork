import { useNavigate } from '@tanstack/react-router';
import { useEffect, type ReactNode } from 'react';
import { inAppLink, kindOf, targetOf, useReadNotification, type NoticeTarget, type NotificationItem } from '@/entities/notification';
import { workItemHref } from '@/entities/work-item';
import { SplitColumn, SplitDetail } from '@/shared/ui/layout/split-view';
import { ToneBadge } from '@/shared/ui/tone-badge';
import { WorkItemDetail } from '@/features/work-item-detail';
import { momentOf } from '../model/format';

/**
 * What a notice's detail shows, for the place it is shown in to frame: its title (the phone page's last crumb), the menu
 * for after it, and its content, which either lays itself out (column false: a work item) or is sections for a
 * settings-page column under the title and description.
 */
export type NoticeView = {
  title: string; description?: string; menu?: ReactNode; content: ReactNode; column: boolean;
  /** What it is, over it in the inbox (DEMO-12), and its own page, the way out of the inbox to it. */
  label: string; href?: string;
};
type Frame = (view: NoticeView) => ReactNode;

/** The notice itself: its title, words, when it came and its kind; its link, when it has one in the app, is its page. */
function NoticeItself({ item, frame }: { item: NotificationItem; frame: Frame }) {
  const kind = kindOf(item.kind);
  return <>{frame({
    title: item.title, description: momentOf(item.createdAt, Date.now()), column: true, label: kind.label, href: inAppLink(item.link),
    content: <div className="flex flex-col items-start gap-4">
      <ToneBadge label={kind.label} tone={kind.color} />
      {item.message ? <p className="text-sm whitespace-pre-wrap">{item.message}</p> : null}
    </div>,
  })}</>;
}

function WorkItemNotice({ target, frame }: { target: NoticeTarget; frame: Frame }) {
  const navigate = useNavigate();
  return <>{frame({
    title: `${target.projectKey}-${target.number}`, column: false, label: `${target.projectKey}-${target.number}`, href: workItemHref(target),
    content: <WorkItemDetail projectKey={target.projectKey} number={target.number} hrefOf={workItemHref}
      onDeleted={() => void navigate({ href: '/inbox', replace: true })} />,
  })}</>;
}

/**
 * A notice opened: the work item it points to shown in place, or, for anything else or a target that is gone, the notice
 * itself. Opening it marks it read. frame lays the view out where it is shown (the inbox's detail, a phone's page).
 */
export function NoticeDetail({ item, frame }: { item: NotificationItem; frame: Frame }) {
  const { mutate: read } = useReadNotification();
  const unread = !item.readAt;
  useEffect(() => { if (unread) read(item.id); }, [unread, item.id, read]);
  const target = targetOf(item.link);
  if (target) return <WorkItemNotice key={`${target.projectKey}-${target.number}`} target={target} frame={frame} />;
  return <NoticeItself item={item} frame={frame} />;
}

/**
 * A view laid out in the inbox's detail under its bar (what it is, its menu, the way to its page): sections in a
 * settings-page column under the title, or as it lays itself out.
 */
export const inboxFrame: Frame = view => <SplitDetail label={view.label} title={view.title} href={view.href} menu={view.menu}>
  {view.column ? <SplitColumn title={view.title} description={view.description}>{view.content}</SplitColumn> : view.content}
</SplitDetail>;
