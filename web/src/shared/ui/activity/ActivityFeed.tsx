import { useState, type ReactNode } from 'react';
import { cn } from 'cn';
import { ActionMenu, type MenuAction } from '@/shared/ui/kit/action-menu';
import { ConfirmDialog } from '@/shared/ui/kit/confirm-dialog';
import { PenSquareIcon, Trash2Icon } from '@/shared/ui/kit/icon';
import { CommentComposer as KitCommentComposer, Quote } from '@/shared/ui/kit/reading';
import { solarIcon } from '../icons';
import { Mark } from '../mark-picker';
import { PersonAvatar } from '../person';

export { Quote };

/**
 * One entry of a timeline, as a domain gives it (결정기록 2026-11-04 공통 활동): something that happened (its sentence after
 * the name of who did it, and its icon) or a comment (its text, the words of the body it quotes, when it was edited, the
 * comment it replies to).
 */
export type ActivityItem = {
  id: string; kind: 'event' | 'comment'; at: string; actorId?: string; actorName?: string;
  text?: string; icon?: string; body?: string; quote?: string; editedAt?: string; parentId?: string;
  /** 본문 블록에 단 스레드의 첫 댓글이면 그 블록, 해결했으면 그때. */
  blockId?: string; resolvedAt?: string;
  agent?: { id?: string; name?: string; icon?: string; color?: string };
  /** 사람이 아닌 실행자(Git 연동 같은 자동 규칙): 사람 그림 대신 그 표식과 이름으로 보인다. */
  system?: { name: string; icon: string };
};

const when = new Intl.DateTimeFormat('ko-KR', { month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const moment = (at: string) => when.format(new Date(at));

/**
 * 활동: what happened to a thing with a body and what was said about it, on one rule as GitHub draws an issue's (BIT's
 * 활동), oldest first: the changes as quiet lines with their mark on the rule, the comments as cards over it (a quote of the
 * body they were written on above their text; onQuote shows those words in the body), each with its replies inside it
 * as Linear's threads, one level. Whoever may write comments in the box at the foot (Enter sends, Shift+Enter a new line)
 * and replies at a card's foot; their own they change and delete, and a moderator deletes anyone's. The kit's reading
 * ActivityFeed draws the same; this one keeps cowork's agents, automatic actors and resolved threads.
 */
export function ActivityFeed({ items, meId, canWrite, canModerate = false, error, onComment, onEdit, onDelete, onQuote }: {
  items: ActivityItem[]; meId?: string; canWrite: boolean; canModerate?: boolean;
  /** Why the last change to the comments failed, said under the box. */
  error?: string;
  /** A comment, or with parentId a reply to that comment. */
  onComment: (body: string, parentId?: string) => Promise<unknown>;
  onEdit: (id: string, body: string) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
  onQuote?: (quote: string, blockId?: string) => void;
}) {
  const [deleting, setDeleting] = useState<ActivityItem | null>(null);
  const [isBusy, setBusy] = useState(false);
  const remove = (item: ActivityItem) => {
    setBusy(true);
    onDelete(item.id).then(() => setDeleting(null), () => undefined).finally(() => setBusy(false));
  };
  // A reply stands in its comment's card; one whose comment is gone stands on its own.
  const ids = new Set(items.map(item => item.id));
  const isReply = (item: ActivityItem) => !!item.parentId && ids.has(item.parentId);
  const repliesOf = (id: string) => items.filter(item => item.parentId === id);
  const mine = (item: ActivityItem) => !!meId && item.actorId === meId;
  const comment = (item: ActivityItem): CommentProps => ({
    item, canEdit: canWrite && mine(item), canDelete: canWrite && (mine(item) || canModerate), onQuote,
    onSave: body => onEdit(item.id, body), onDelete: () => setDeleting(item),
  });
  return <section aria-label="활동" className="flex flex-col gap-3">
    <h2 className="text-xs font-medium text-muted-foreground">활동</h2>
    {items.length ? <Timeline label="활동 기록">
      {items.filter(item => !isReply(item)).map(item => (item.kind === 'comment'
        ? <TimelineItem key={item.id} kind="card">
          <article aria-label={`${actorName(item)}의 댓글`} className="rounded-xl border bg-card">
            <Comment {...comment(item)} />
            {repliesOf(item.id).map(reply => <Comment key={reply.id} {...comment(reply)} isReply />)}
            {canWrite ? <ReplyBox onSend={body => onComment(body, item.id)} /> : null}
          </article>
        </TimelineItem>
        : <EventLine key={item.id} item={item} />))}
    </Timeline> : null}
    {canWrite ? <CommentComposer onSend={onComment} /> : null}
    {error ? <p role="alert" className="text-xs text-muted-foreground">{error}</p> : null}
    <ConfirmDialog open={!!deleting} onOpenChange={open => { if (!open && !isBusy) setDeleting(null); }}
      title="댓글을 지울까요?" description="지운 댓글은 활동에서 사라집니다."
      action={{ label: '삭제', onAction: () => { if (deleting) remove(deleting); }, isPending: isBusy }} />
  </section>;
}

const actorName = (item: ActivityItem) => item.system ? item.system.name : `${item.actorName ?? '알 수 없는 사람'}${item.agent?.name ? ` · ${item.agent.name}` : ''}`;

/** Who did it: the person's picture (or an automatic actor's mark), with the agent's mark tucked over its edge. */
function ActorPictures({ item }: { item: ActivityItem }) {
  return <span role="group" aria-label={actorName(item)} className="flex shrink-0 items-center">
    {item.system ? <Mark isCircular icon={item.system.icon} letter={item.system.name} /> : <PersonAvatar id={item.actorId} name={item.actorName} size={20} />}
    {item.agent ? <span className="z-1 -ml-1 inline-flex rounded-full bg-background ring-2 ring-background in-[article]:bg-card in-[article]:ring-card">
      <Mark isCircular icon={item.agent.icon ?? 'agent'} color={item.agent.color} letter={item.agent.name ?? 'AI'} />
    </span> : null}
  </span>;
}

function When({ item, isEdited = false }: { item: ActivityItem; isEdited?: boolean }) {
  return <time dateTime={item.at} title={new Date(item.at).toLocaleString('ko-KR')}
    className="text-xs whitespace-nowrap text-muted-foreground max-md:inline-block">
    {isEdited ? `${moment(item.at)} · 고침` : moment(item.at)}
  </time>;
}

/** 실행 사용자와 에이전트의 표식을 함께 표시한다. */
function EventLine({ item }: { item: ActivityItem }) {
  const EventIcon = solarIcon(item.icon ?? 'edit');
  return <TimelineItem mark={<EventIcon />}>
    <div className="flex items-start gap-2">
      <ActorPictures item={item} />
      <p className="m-0 min-w-0 text-sm/5 break-keep wrap-anywhere text-muted-foreground max-md:leading-normal">
        <span className="font-medium text-foreground">{actorName(item)}</span>{` ${item.text ?? ''} · `}
        <When item={item} />
      </p>
    </div>
  </TimelineItem>;
}

type CommentProps = {
  item: ActivityItem; canEdit: boolean; canDelete: boolean; onQuote?: (quote: string, blockId?: string) => void;
  onSave: (body: string) => Promise<unknown>; onDelete: () => void; isReply?: boolean;
};

/**
 * A comment or a reply in a card: its writer's picture, name and when (고침 when changed) in its head, the words of the
 * body it quotes, then its text under the name. A reply is parted from what is above it by a hairline. Its writer
 * changes it in place with the same box.
 */
function Comment({ item, canEdit, canDelete, onQuote, onSave, onDelete, isReply = false }: CommentProps) {
  const [isEditing, setEditing] = useState(false);
  const actions: MenuAction[] = [
    ...(canEdit ? [{ label: '고치기', icon: PenSquareIcon, onSelect: () => setEditing(true) }] : []),
    ...(canDelete ? [{ label: '삭제', icon: Trash2Icon, onSelect: onDelete }] : []),
  ];
  const name = actorName(item);
  return <div aria-label={isReply ? `${name}의 답글` : undefined} className={cn('flex min-w-0 flex-col', isReply && 'border-t')}>
    <header className="flex min-h-10 items-center gap-2 pt-2 pr-2 pl-3 text-sm">
      <ActorPictures item={item} />
      <span className="font-medium">{name}</span>
      <When item={item} isEdited={!!item.editedAt} />
      {item.resolvedAt ? <span className="text-xs text-muted-foreground">· 해결됨</span> : null}
      {actions.length && !isEditing ? <span className="ml-auto"><ActionMenu label="댓글 메뉴" actions={actions} size="row" /></span> : null}
    </header>
    {item.quote ? <Quote text={item.quote} onQuote={onQuote ? quote => onQuote(quote, item.blockId) : undefined} /> : null}
    {isEditing
      ? <div className="px-3 pt-1 pb-3">
        <CommentComposer initial={item.body ?? ''} label="댓글 고치기" onCancel={() => setEditing(false)}
          onSend={body => onSave(body).then(() => setEditing(false))} />
      </div>
      // The text starts under the name: in past the card's edge, the picture (an agent's mark beside it too) and their gap.
      : <p className={cn('m-0 pt-1 pr-4 pb-4 text-[0.875rem]/normal whitespace-pre-wrap wrap-anywhere max-md:text-base', item.agent ? 'pl-14' : 'pl-10')}>{item.body}</p>}
  </div>;
}

/**
 * A card's foot, as Linear's: a quiet 답글 남기기 row under a hairline; pressed, the comment box in its place (Esc or
 * 취소 folds it back). A reply sent folds it too.
 */
function ReplyBox({ onSend }: { onSend: (body: string) => Promise<unknown> }) {
  const [isOpen, setOpen] = useState(false);
  return <div className="border-t px-3 py-2">
    {isOpen
      ? <CommentComposer label="답글" placeholder="답글을 남겨 주세요" onCancel={() => setOpen(false)}
        onSend={body => onSend(body).then(() => setOpen(false))} />
      : <button type="button" onClick={() => setOpen(true)}
        className="h-8 w-full cursor-text rounded-md px-2 text-left text-sm text-muted-foreground outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring max-md:h-11">
        답글 남기기…
      </button>}
  </div>;
}

/*
 * The rule (activity's, after GitHub's): it runs down the middle of a comment card's 20px picture (the card's 1px border,
 * 12px in and half the picture: 23px). Each entry draws its own piece above (::before) and below (::after) its mark, so the
 * rule leaves the mark bare and stops at the first entry's mark and the last one's.
 */
const RAIL = 'relative before:absolute before:top-0 before:left-[calc(1.4375rem-0.5px)] before:w-px before:bg-input after:absolute after:bottom-0 after:left-[calc(1.4375rem-0.5px)] after:w-px after:bg-input first:before:hidden last:after:hidden';

/** An entry on the rule: a line hangs its mark on it; a card spans the width over it, its picture on the rule's line. */
export function TimelineItem({ mark, kind = 'line', children }: { mark?: ReactNode; kind?: 'line' | 'card'; children: ReactNode }) {
  if (kind === 'card') return <li className={cn(RAIL, 'py-2 before:h-2 after:top-2 *:relative *:z-1')}>{children}</li>;
  return <li className={cn(RAIL, 'grid grid-cols-[1.25rem_minmax(0,1fr)] items-start gap-x-3 py-1 pl-3.25 before:h-1 after:top-6')}>
    <span aria-hidden className="grid size-5 place-items-center text-icon-muted [&_svg]:size-4">{mark}</span>
    <div className="min-w-0">{children}</div>
  </li>;
}

/**
 * Where a comment is written: the kit's comment box (its round send button inside; Enter sends, Shift+Enter breaks the
 * line). The text stays until it is saved, so a failed send loses nothing; a comment keeps to 10,000 characters, the
 * server's limit. Changing one, 취소 gives it up.
 */
export function CommentComposer({ initial = '', label = '댓글', placeholder = '의견을 남겨 주세요', onSend, onCancel }: {
  initial?: string; label?: string; placeholder?: string;
  onSend: (body: string) => Promise<unknown>; onCancel?: () => void;
}) {
  return <KitCommentComposer initial={initial} label={label} placeholder={placeholder} onCancel={onCancel}
    onSend={body => onSend(body.slice(0, 10000))} />;
}

/** A history on one rule (활동's, and 연결된 코드 on the same rule and rhythm): its entries are TimelineItems. */
export function Timeline({ label, children }: { label: string; children: ReactNode }) {
  return <ol aria-label={label} className="m-0 flex list-none flex-col p-0">{children}</ol>;
}
