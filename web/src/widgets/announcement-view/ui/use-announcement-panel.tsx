import { useQuery } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import {
  announcementOptions, featureText, fileLinkOptions, momentText, readersOptions, useDeleteAnnouncement, useMarkRead,
} from '@/entities/announcement';
import { isNotFound } from '@/shared/api';
import { stampText } from '@/shared/lib/date-stamp';
import { useOpenPanel } from '@/shared/lib/panel';
import { ActionMenu, type MenuAction } from '@/shared/ui/action-menu';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { ClockIcon, EyeIcon, LinkIcon, PenSquareIcon, PinIcon, Trash2Icon } from '@/shared/ui/icon';
import { InfoPill } from '@/shared/ui/info-pill';
import { PageState } from '@/shared/ui/page-state';
import { PersonAvatar } from '@/shared/ui/person';
import { PropertyPill } from '@/shared/ui/property-pill';
import { DetailLayout } from '@/shared/ui/reading';
import { MarkdownRead } from '@/shared/ui/rich-body';
import { Spinner } from '@/shared/ui/spinner';
import { toast } from '@/shared/ui/toast';
import { AttachmentFiles } from './AttachmentFiles';

export type AnnouncementPanel = {
  /** The notice's title (제목 없음 when it has none); 공지 until it is read. */
  title: string;
  /** What one does to the notice itself (링크 복사, and 수정 · 삭제 for who may change it), for after its name. */
  menu: ReactNode;
  /** The notice read at length, its dialogs, or why it cannot be shown. */
  body: ReactNode;
  /** Whether it is gone (deleted, or never was), so a place with something else to show can show that instead. */
  isMissing: boolean;
};

const copyLink = (id: string) => navigator.clipboard.writeText(`${window.location.origin}/announcements/${id}`)
  .then(() => toast.add({ title: '주소를 복사했습니다.' }), () => toast.add({ title: '주소를 복사하지 못했습니다.' }));

/** Who read the notice and when they first did, earliest first; for its writer and administrators. */
function Readers({ id }: { id: string }) {
  const readers = useQuery(readersOptions(id));
  if (readers.isPending) return <p className="px-2 py-1.5 text-sm text-muted-foreground">불러오는 중…</p>;
  if (readers.isError) return <p role="alert" className="px-2 py-1.5 text-sm text-destructive">{readers.error.message}</p>;
  if (readers.data.length === 0) return <p className="px-2 py-1.5 text-sm text-muted-foreground">아직 읽은 사람이 없습니다.</p>;
  return <div className="flex flex-col gap-1">
    <p className="px-2 pt-1 text-xs text-muted-foreground">처음 읽은 순서</p>
    <ul aria-label="읽은 사람" className="flex max-h-80 flex-col overflow-y-auto max-md:max-h-none">
      {readers.data.map(reader => <li key={reader.employeeId} className="flex min-h-11 items-center gap-2.5 px-2 py-1.5">
        <PersonAvatar id={reader.employeeId} name={reader.name ?? undefined} size={24} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm">{reader.name ?? '알 수 없는 구성원'}</span>
          {reader.departmentName ? <span className="truncate text-xs text-muted-foreground">{reader.departmentName}</span> : null}
        </span>
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{momentText(reader.readAt)}</span>
      </li>)}
    </ul>
  </div>;
}

/**
 * A notice ready to be read wherever it opens (its own page, 받은 알림's detail) on the detail page every body has
 * (DetailLayout): its title, its body as written in Markdown with its pictures in place and its files below, and as
 * properties who wrote it and when, how many read it (its writer and administrators open who did, beside the pill) and
 * how it is featured (for them). Opening a published one marks it read.
 * Deleting it calls onDeleted; errorAction is offered when it cannot be read.
 */
export function useAnnouncementPanel(id: string, { onDeleted, onEdit, errorAction }: {
  onDeleted: () => void;
  /** 수정을 여는 길. 없으면 지금 화면 위 대화상자(공지사항 목록의 오른쪽 칸은 그 칸에서 연다). */
  onEdit?: () => void;
  errorAction?: ReactNode;
}): AnnouncementPanel {
  const openPanel = useOpenPanel();
  const detail = useQuery(announcementOptions(id));
  const notice = detail.data;
  const published = notice?.status === 'PUBLISHED';
  const title = notice ? notice.title || '제목 없음' : '공지';
  const { mutate: markRead } = useMarkRead();
  useEffect(() => { if (published) markRead(id); }, [published, id, markRead]);
  const [isDeleting, setDeleting] = useState(false);
  const remove = useDeleteAnnouncement(onDeleted);
  const feature = notice ? featureText(notice) : null;
  const actions: MenuAction[] = [
    { label: '링크 복사', icon: LinkIcon, onSelect: () => void copyLink(id) },
    ...(notice?.editable ? [
      { label: '수정', isPrimary: true, icon: PenSquareIcon, onSelect: () => (onEdit ? onEdit() : openPanel(`/office/announcements/${id}/edit`, { surface: 'inherit' })) },
      { label: '삭제', icon: Trash2Icon, onSelect: () => { remove.reset(); setDeleting(true); } },
    ] : []),
  ];
  const menu = <ActionMenu isInline label="공지 메뉴" title={title} actions={actions} />;
  const linkOf = fileLinkOptions(id);
  const body = <>
    {detail.isPending ? <div className="flex flex-1 items-center justify-center bg-background py-16"><Spinner aria-label="공지를 불러오는 중" /></div>
      : detail.isError ? <PageState kind={isNotFound(detail.error) ? 'not-found' : 'error'} title={isNotFound(detail.error) ? '공지를 찾을 수 없습니다' : '공지를 불러오지 못했습니다'}
        description={isNotFound(detail.error) ? '삭제했거나 주소가 바뀐 공지입니다.' : detail.error.message} action={errorAction} />
        : notice ? <DetailLayout label={title} title={title} sections={[{
          title: '속성', items: <>
            <InfoPill label={published ? '게시' : '저장'} icon={<ClockIcon />}>
              {`${momentText(published ? notice.publishedAt : notice.updatedAt)}${published ? ' 게시' : ' 저장'}`}
            </InfoPill>
            {published ? notice.readersVisible
              ? <PropertyPill label="읽은 사람" icon={<EyeIcon />} text={`${notice.readCount}명 읽음`} width="w-80">{() => <Readers id={id} />}</PropertyPill>
              : <InfoPill label="읽은 사람" icon={<EyeIcon />}>{`${notice.readCount}명 읽음`}</InfoPill> : null}
            {notice.editable && feature ? <InfoPill label="알림 방식" icon={<PinIcon />}>{feature}</InfoPill> : null}
          </>,
        }, {
          title: '정보', items: <>
            {notice.authorName ? <InfoPill label="작성자" icon={<PersonAvatar id={notice.authorId ?? undefined} name={notice.authorName} size={16} isStatic />}>
              {notice.authorName}
            </InfoPill> : null}
            {notice.updatedAt ? <InfoPill label="수정일" icon={<ClockIcon />}>{stampText(notice.updatedAt)}</InfoPill> : null}
          </>,
        }]}>
          {notice.content
            ? <MarkdownRead value={notice.content} linkOf={linkOf} label="공지 본문" />
            : <p className="text-muted-foreground">본문이 없습니다.</p>}
          {notice.attachments.length > 0 ? <AttachmentFiles files={notice.attachments} linkOf={linkOf} /> : null}
        </DetailLayout> : null}
    <ConfirmDialog open={isDeleting} onOpenChange={open => { if (!open) setDeleting(false); }}
      title="이 공지를 삭제할까요?" description={remove.error?.message ?? '삭제한 공지는 목록에서 사라지고 첨부와 함께 되돌릴 수 없습니다.'}
      action={{ label: '삭제', isPending: remove.isPending, onAction: () => remove.mutate(id) }} />
  </>;
  return { title, menu, body, isMissing: detail.isError && isNotFound(detail.error) };
}
