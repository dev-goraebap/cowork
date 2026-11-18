import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent, type RefObject } from 'react';
import { ActionMenu, type MenuAction } from '@/shared/ui/kit/action-menu';
import { Button } from '@/shared/ui/kit/button';
import { ConfirmDialog } from '@/shared/ui/kit/confirm-dialog';
import { CheckIcon, PenSquareIcon, Trash2Icon, XIcon } from '@/shared/ui/kit/icon';
import { PersonAvatar } from '@/shared/ui/person';
import { CommentComposer } from '@/shared/ui/kit/reading';

/** 블록 스레드의 댓글 하나: 첫 댓글이나 답글. */
export type BlockCommentItem = {
  id: string; at: string; actorId?: string; actorName?: string; body?: string; editedAt?: string;
  agent?: { name?: string };
};
/** 본문 블록 하나에 달린 스레드: 첫 댓글의 id, 그 블록, 단 때의 블록 글 앞부분, 해결 여부와 댓글들(첫 댓글부터). */
export type BlockThread = { id: string; blockId: string; quote?: string; resolvedAt?: string; comments: BlockCommentItem[] };
/**
 * 본문의 블록 댓글(2026-11-11 사용자 결정): 댓글은 주인의 활동 기록에 있고, 스레드 첫 댓글이 블록 하나에 달린다. 도메인이 활동 기록에서
 * 스레드를 만들어(blockThreadsOf) 주고, 쓰기·답글·고치기·지우기·해결을 맡는다.
 */
export type BlockComments = {
  threads: BlockThread[]; meId?: string; canComment: boolean; canModerate?: boolean;
  create: (blockId: string, quote: string, body: string) => Promise<unknown>;
  reply: (threadId: string, body: string) => Promise<unknown>;
  edit: (commentId: string, body: string) => Promise<unknown>;
  remove: (commentId: string) => Promise<unknown>;
  resolve: (threadId: string, resolved: boolean) => Promise<unknown>;
};

/** 활동 기록의 댓글에서 블록 스레드를 만든다: 블록에 달린 첫 댓글마다 그 답글을 차례로 붙인다. */
export function blockThreadsOf<T extends BlockCommentItem & { parentId?: string; blockId?: string; quote?: string; resolvedAt?: string }>(comments: T[]): BlockThread[] {
  const roots = comments.filter(comment => !comment.parentId && comment.blockId);
  return roots.map(root => ({
    id: root.id, blockId: root.blockId!, quote: root.quote, resolvedAt: root.resolvedAt,
    comments: [root, ...comments.filter(comment => comment.parentId === root.id)],
  }));
}

/** 활동 기록(댓글과 일)에서 블록 댓글을 만든다: 댓글만 골라 스레드로 묶고, 쓰기·해결은 도메인이 준 것으로. */
export function blockCommentsOf(entries: readonly ({ kind: string; id: string; at: string; actorId?: string; actorName?: string; body?: string; editedAt?: string;
  agent?: { name?: string }; parentId?: string; blockId?: string; quote?: string; resolvedAt?: string })[], rest: Omit<BlockComments, 'threads'>): BlockComments {
  return { ...rest, threads: blockThreadsOf(entries.filter(entry => entry.kind === 'COMMENT')) };
}

const THREAD_EVENT = 'cowork:block-thread';
/** 활동 기록에서 블록 댓글을 누르면: 본문이 그 블록으로 가서 스레드를 연다. 본문에 그 블록이 없으면 false. */
export function openBlockThread(blockId: string): boolean {
  if (!document.querySelector(`.ProseMirror [data-block-id="${CSS.escape(blockId)}"]`)) return false;
  window.dispatchEvent(new CustomEvent(THREAD_EVENT, { detail: blockId }));
  return true;
}

const when = new Intl.RelativeTimeFormat('ko-KR', { numeric: 'auto' });
function ago(at: string) {
  const seconds = (new Date(at).getTime() - Date.now()) / 1000;
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [['second', 60], ['minute', 60], ['hour', 24], ['day', 30], ['month', 12], ['year', Infinity]];
  let value = seconds;
  for (const [unit, size] of steps) {
    if (Math.abs(value) < size) return unit === 'second' ? '방금' : when.format(Math.round(value), unit);
    value /= size;
  }
  return '';
}

/** 본문의 맨 바깥 블록: 블록 id → 그 블록의 바깥 요소(표처럼 감싼 상자가 있으면 그 상자). */
function topBlocks(box: HTMLElement) {
  const map = new Map<string, HTMLElement>();
  box.querySelectorAll<HTMLElement>('.ProseMirror > *').forEach(element => {
    const id = element.dataset.blockId ?? element.querySelector<HTMLElement>(':scope > [data-block-id]')?.dataset.blockId;
    if (id && !map.has(id)) map.set(id, element);
  });
  return map;
}
const topBlockAt = (target: EventTarget | null) => {
  let element = (target as HTMLElement | null)?.closest?.<HTMLElement>('.ProseMirror > *') ?? null;
  while (element && !element.parentElement?.classList.contains('ProseMirror')) element = element.parentElement?.closest<HTMLElement>('.ProseMirror > *') ?? null;
  return element;
};
const idOf = (element: HTMLElement) => element.dataset.blockId ?? element.querySelector<HTMLElement>(':scope > [data-block-id]')?.dataset.blockId;
type Box = { top: number; left: number; width: number; height: number };

/**
 * 본문 위의 블록 댓글 층. 댓글 모드(isCommenting)에서는 포인터 아래 블록에 박스를 씌우고, 누르면 그 블록의 스레드 창(없으면 새 댓글)을
 * 연다. 열린 스레드가 있는 블록은 Tiptap처럼 글을 조금 옅게 하고 노란 점선 밑줄을 긋는다. 올리면 진해지고, 누르면 스레드를 연다.
 * 해결한 스레드는 표시하지 않는다(활동 기록에는 남는다).
 */
export function BlockCommentLayer({ box, comments, isCommenting, onCommenting }: {
  box: RefObject<HTMLElement | null>; comments: BlockComments; isCommenting: boolean; onCommenting: (on: boolean) => void;
}) {
  const [layout, setLayout] = useState<Map<string, Box>>(new Map());
  const [hover, setHover] = useState<Box | null>(null);
  const [openBlock, setOpenBlock] = useState<string | null>(null);
  const measure = useCallback(() => {
    const element = box.current;
    if (!element) return;
    const frame = element.getBoundingClientRect(), next = new Map<string, Box>();
    topBlocks(element).forEach((block, id) => {
      const rect = block.getBoundingClientRect();
      next.set(id, { top: rect.top - frame.top, left: rect.left - frame.left, width: rect.width, height: rect.height });
    });
    setLayout(next);
  }, [box]);
  // 본문이 그려지거나 크기가 바뀌면 블록 자리를 다시 잰다(한 프레임에 한 번).
  useLayoutEffect(() => {
    const element = box.current;
    if (!element) return undefined;
    let frame = 0;
    const schedule = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; measure(); }); };
    const resize = new ResizeObserver(schedule), mutation = new MutationObserver(schedule);
    resize.observe(element);
    mutation.observe(element, { childList: true, subtree: true, characterData: true });
    schedule();
    return () => { resize.disconnect(); mutation.disconnect(); cancelAnimationFrame(frame); };
  }, [box, measure]);
  useEffect(() => { measure(); }, [comments.threads, measure]);
  // 열 때 그 자리를 다시 잰다: 처음 들어와 도표·사진이 늦게 그려지면 앞서 잰 자리가 어긋나 있다.
  const openAt = useCallback((blockId: string) => { measure(); setOpenBlock(blockId); }, [measure]);
  // 활동 기록에서 블록 댓글을 누르면 그 블록으로 가서 연다.
  useEffect(() => {
    const open = (event: Event) => {
      const blockId = (event as CustomEvent<string>).detail;
      const element = box.current && topBlocks(box.current).get(blockId);
      element?.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      openAt(blockId);
    };
    window.addEventListener(THREAD_EVENT, open);
    return () => window.removeEventListener(THREAD_EVENT, open);
  }, [box, openAt]);
  const commented = useRef(new Set<string>());
  // 댓글 모드: Esc로 끈다.
  useEffect(() => {
    if (!isCommenting) { setHover(null); return undefined; }
    const keys = (event: KeyboardEvent) => { if (event.key === 'Escape') onCommenting(false); };
    window.addEventListener('keydown', keys);
    return () => window.removeEventListener('keydown', keys);
  }, [isCommenting, onCommenting]);
  // 댓글이 달린 블록을 누르면(링크·단추·글 고르기는 빼고) 그 스레드를 연다.
  useEffect(() => {
    const element = box.current;
    if (!element || isCommenting) return undefined;
    const click = (event: MouseEvent) => {
      if ((event.target as Element).closest('a, button, input, textarea, [contenteditable="true"] *') || window.getSelection()?.toString()) return;
      const block = topBlockAt(event.target), id = block && idOf(block);
      if (!id || !commented.current.has(id)) return;
      openAt(id);
    };
    element.addEventListener('click', click);
    return () => element.removeEventListener('click', click);
  }, [box, isCommenting, openAt]);
  useEffect(() => {
    const element = box.current;
    if (!element) return undefined;
    element.dataset.commenting = isCommenting ? 'true' : 'false';
    if (!isCommenting) return undefined;
    const frameOf = () => element.getBoundingClientRect();
    const move = (event: globalThis.PointerEvent) => {
      const block = topBlockAt(event.target);
      if (!block || !idOf(block)) { setHover(null); return; }
      const rect = block.getBoundingClientRect(), frame = frameOf();
      setHover({ top: rect.top - frame.top, left: rect.left - frame.left, width: rect.width, height: rect.height });
    };
    const click = (event: MouseEvent) => {
      const block = topBlockAt(event.target), id = block && idOf(block);
      if (!id) return;
      event.preventDefault();
      event.stopPropagation();
      onCommenting(false);
      openAt(id);
    };
    element.addEventListener('pointermove', move);
    element.addEventListener('click', click, true);
    return () => { element.removeEventListener('pointermove', move); element.removeEventListener('click', click, true); delete element.dataset.commenting; };
  }, [box, isCommenting, onCommenting, openAt]);

  const open = comments.threads.filter(thread => !thread.resolvedAt);
  const byBlock = new Map<string, BlockThread>();
  open.forEach(thread => { if (!byBlock.has(thread.blockId)) byBlock.set(thread.blockId, thread); });
  commented.current = new Set(byBlock.keys());
  const scope = useId().replace(/:/g, '');
  useEffect(() => { if (box.current) box.current.dataset.commentScope = scope; }, [box, scope]);
  // 열린 창은 그 블록을 따라간다: 도표·사진이 늦게 그려져 블록이 밀리면(처음 들어왔을 때) 창도 함께 옮긴다.
  const [follow, setFollow] = useState<Box | null>(null);
  useEffect(() => {
    if (!openBlock) { setFollow(null); return undefined; }
    let frame = 0;
    const track = () => {
      const element = box.current, block = element && topBlocks(element).get(openBlock);
      if (element && block) {
        const rect = block.getBoundingClientRect(), outer = element.getBoundingClientRect();
        const next = { top: rect.top - outer.top, left: rect.left - outer.left, width: rect.width, height: rect.height };
        setFollow(now => now && now.top === next.top && now.left === next.left && now.width === next.width && now.height === next.height ? now : next);
      }
      frame = requestAnimationFrame(track);
    };
    track();
    return () => cancelAnimationFrame(frame);
  }, [box, openBlock]);
  const openBox = openBlock ? follow ?? layout.get(openBlock) : undefined;
  const quoteOf = (blockId: string) => {
    const element = box.current && topBlocks(box.current).get(blockId);
    return (element?.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 200);
  };
  return <>
    {byBlock.size ? <style>{markRules(scope, [...byBlock.keys()], openBlock)}</style> : null}
    {/* 댓글 모드에서 포인터 아래 블록에 씌우는 박스: 블록보다 조금 넓게, 옅은 바탕과 강조색 테두리. */}
    {/* check-ui: allow-style 블록마다 잰 자리와 크기다. */}
    {isCommenting && hover ? <div className="pointer-events-none absolute z-1 box-border rounded-[0.625rem] bg-primary/5 outline-[1.5px] outline-offset-[5px] outline-primary/45 outline-solid" style={toStyle(hover)} aria-hidden /> : null}
    {openBlock && openBox ? <ThreadCard key={openBlock} place={openBox} thread={byBlock.get(openBlock)} comments={comments}
      onClose={() => setOpenBlock(null)}
      onCreate={body => comments.create(openBlock, quoteOf(openBlock), body)} /> : null}
  </>;
}

/**
 * 댓글이 달린 블록의 모양(Tiptap의 댓글 글처럼): 글을 조금 옅게, 노란 점선 밑줄. 올리거나 그 스레드를 보는 동안 진하게. 블록 id는
 * 이 화면이 만든 값이라 따옴표만 걸러 선택자에 넣는다.
 */
function markRules(scope: string, blockIds: string[], active: string | null) {
  const at = (id: string) => {
    const safe = id.replace(/["\\]/g, '');
    return `[data-comment-scope="${scope}"] .ProseMirror > :is([data-block-id="${safe}"], :has(> [data-block-id="${safe}"]))`;
  };
  const all = blockIds.map(at).join(',\n');
  return `${all} { cursor: pointer; opacity: 0.72;
  text-decoration: underline dashed color-mix(in srgb, var(--mark-medium) 85%, transparent); text-decoration-thickness: 1.5px;
  text-underline-offset: 0.3em; transition: opacity 120ms ease, text-decoration-color 120ms ease; }
${blockIds.map(id => `${at(id)}:hover`).join(',\n')}${active && blockIds.includes(active) ? `,\n${at(active)}` : ''} {
  opacity: 1; text-decoration-color: var(--mark-medium); }`;
}

/** 본문 칸에 붙이는 모양: 층의 기준이 되고, 댓글 모드에서는 커서가 '더하기'(copy)로 바뀐다. */
export const blockCommentBox = 'relative data-[commenting=true]:cursor-copy data-[commenting=true]:[&_.ProseMirror]:cursor-copy';

const toStyle = (place: Box) => ({ insetBlockStart: `${place.top}px`, insetInlineStart: `${place.left}px`, inlineSize: `${place.width}px`, blockSize: `${place.height}px` }) as CSSProperties;

/** 블록 아래에 뜨는 스레드 창: 첫 댓글과 답글, 해결·닫기, 답글 칸(스레드가 없으면 새 댓글 칸). Esc나 바깥을 누르면 닫는다. */
function ThreadCard({ place, thread, comments, onClose, onCreate }: {
  place: Box; thread?: BlockThread; comments: BlockComments; onClose: () => void; onCreate: (body: string) => Promise<unknown>;
}) {
  const card = useRef<HTMLDivElement>(null);
  const [deleting, setDeleting] = useState<BlockCommentItem | null>(null);
  const [isBusy, setBusy] = useState(false);
  useEffect(() => {
    const keys = (event: KeyboardEvent) => { if (event.key === 'Escape' && !deleting) onClose(); };
    const outside = (event: globalThis.PointerEvent) => {
      const target = event.target as Node;
      if (card.current?.contains(target) || (target as Element).closest?.('[role="menu"], [role="dialog"], [role="alertdialog"]')) return;
      onClose();
    };
    window.addEventListener('keydown', keys);
    window.addEventListener('pointerdown', outside, true);
    return () => { window.removeEventListener('keydown', keys); window.removeEventListener('pointerdown', outside, true); };
  }, [onClose, deleting]);
  // 열리면 창이 보이게 하고 입력 칸으로 간다(바로 쓸 수 있게).
  useEffect(() => {
    card.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    card.current?.querySelector<HTMLElement>('textarea, [contenteditable="true"]')?.focus({ preventScroll: true });
  }, []);
  const at = { insetBlockStart: `${place.top + place.height + 8}px`, insetInlineStart: `${Math.max(0, place.left)}px` } as CSSProperties;
  const mine = (item: BlockCommentItem) => !!comments.meId && item.actorId === comments.meId;
  const remove = (item: BlockCommentItem) => {
    setBusy(true);
    comments.remove(item.id).finally(() => { setBusy(false); setDeleting(null); if (thread && item.id === thread.id) onClose(); });
  };
  return <div ref={card} role="dialog" aria-label="블록 댓글"
    className="absolute z-5 box-border flex max-h-120 w-[min(26rem,100%)] flex-col overflow-hidden rounded-[0.875rem] border border-input bg-popover text-popover-foreground shadow-lg"
    // check-ui: allow-style 블록 아래 자리(잰 값)다.
    style={at} onPointerDown={(event: PointerEvent) => event.stopPropagation()}>
    <div className="flex flex-none items-center gap-1 border-b py-2 pr-2 pl-4">
      <p className="min-w-0 flex-1 text-sm font-semibold text-muted-foreground">{thread ? '댓글' : '새 댓글'}</p>
      {thread && comments.canComment ? <Button variant="ghost" size="icon-sm" aria-label="해결" title="해결하고 닫기"
        onClick={() => void comments.resolve(thread.id, true).then(onClose)}><CheckIcon /></Button> : null}
      <Button variant="ghost" size="icon-sm" aria-label="닫기" title="닫기 (Esc)" onClick={onClose}><XIcon /></Button>
    </div>
    {thread ? <div className="flex min-h-0 flex-auto flex-col divide-y overflow-y-auto">
      {thread.comments.map(item => <ThreadComment key={item.id} item={item}
        canEdit={comments.canComment && mine(item)} canDelete={comments.canComment && (mine(item) || !!comments.canModerate)}
        onSave={body => comments.edit(item.id, body)} onDelete={() => setDeleting(item)} />)}
    </div> : null}
    {comments.canComment ? <div className="flex-none border-t px-3 pt-2 pb-3">
      <CommentComposer label={thread ? '답글' : '댓글'} placeholder={thread ? '답글 쓰기…' : '댓글 쓰기…'}
        onSend={body => thread ? comments.reply(thread.id, body) : onCreate(body)} />
    </div> : null}
    <ConfirmDialog open={!!deleting} onOpenChange={value => { if (!value && !isBusy) setDeleting(null); }}
      title="댓글을 지울까요?" description={deleting && thread && deleting.id === thread.id ? '첫 댓글을 지우면 이 블록의 스레드가 닫힙니다. 답글은 활동에 남습니다.' : '지운 댓글은 활동에서 사라집니다.'}
      action={{ label: '삭제', isPending: isBusy, onAction: () => { if (deleting) remove(deleting); } }} />
  </div>;
}

function ThreadComment({ item, canEdit, canDelete, onSave, onDelete }: {
  item: BlockCommentItem; canEdit: boolean; canDelete: boolean; onSave: (body: string) => Promise<unknown>; onDelete: () => void;
}) {
  const [isEditing, setEditing] = useState(false);
  const actions: MenuAction[] = [
    ...(canEdit ? [{ label: '댓글 고치기', icon: PenSquareIcon, onSelect: () => setEditing(true) }] : []),
    ...(canDelete ? [{ label: '댓글 지우기', icon: Trash2Icon, onSelect: onDelete }] : []),
  ];
  const name = `${item.actorName ?? '알 수 없는 사람'}${item.agent?.name ? ` · ${item.agent.name}` : ''}`;
  return <div className="flex flex-col gap-1 px-4 py-3">
    <div className="flex items-center gap-2">
      <PersonAvatar id={item.actorId} name={item.actorName} />
      <p className="min-w-0 truncate text-sm font-semibold">{name}</p>
      <p className="min-w-0 flex-1 text-xs whitespace-nowrap text-muted-foreground">{item.editedAt ? `${ago(item.at)} · 고침` : ago(item.at)}</p>
      {actions.length && !isEditing ? <ActionMenu label="댓글 메뉴" actions={actions} size="row" /> : null}
    </div>
    {isEditing
      ? <CommentComposer initial={item.body ?? ''} label="댓글 고치기" onCancel={() => setEditing(false)} onSend={body => onSave(body).then(() => setEditing(false))} />
      : <p className="m-0 ps-8 text-sm wrap-anywhere whitespace-pre-wrap">{item.body}</p>}
  </div>;
}
