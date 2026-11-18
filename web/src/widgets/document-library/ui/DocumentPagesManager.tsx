import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useState, type ReactNode } from 'react';
import { libraryOptions, saveDocumentOrder, useCreateBoxDocument, useDeleteDocument, useRenameDocument, type DocumentRow } from '@/entities/document';
import { rowReorderStyles as rows, useRowReorder } from '@/shared/lib/row-reorder';
import { cn } from 'cn';
import { Button } from '@/shared/ui/button';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { DetailSurface } from '@/shared/ui/detail-surface';
import { FolderIcon, GripIcon, PenSquareIcon, PlusIcon, Trash2Icon } from '@/shared/ui/icon';
import { Input } from '@/shared/ui/input';
import { MarkIcon, MarkPicker } from '@/shared/ui/mark-picker';
import { PageState } from '@/shared/ui/page-state';
import { RowMenu, type MenuAction } from '@/shared/ui/popup';
import { Spinner } from '@/shared/ui/spinner';
import { pageCrumbs } from '@/shared/ui/nav-icon';
import type { Crumb } from '../model/page-tools';
import { MovePageDialog } from './MovePageDialog';
import type { DetailSurfaceOptions } from './ProjectLibrary';

/** 지금 열린 입력 하나: 어느 페이지 아래에 새 페이지를 쓰는지, 어느 페이지의 이름을 바꾸는지. */
type Draft = { kind: 'new'; parentId: string } | { kind: 'rename'; id: string } | null;
type Manage = {
  pages: DocumentRow[]; draft: Draft; setDraft: (draft: Draft) => void; busy: boolean;
  create: (parentId: string, title: string, mark?: { icon: string | null; color: string | null }) => void; rename: (page: DocumentRow, title: string) => void;
  onMove: (page: DocumentRow) => void; onDelete: (page: DocumentRow) => void;
  order: (ids: string[], parentId: string) => Promise<void>; onError: (failure: unknown) => void;
};
const ManageContext = createContext<Manage | null>(null);
const useManage = () => useContext(ManageContext)!;

/** 관리 다이얼로그의 한 줄: 손잡이 · 아이콘 · 이름 · …, 가리키면 옅은 바탕. */
const ROW = 'flex min-h-9 min-w-0 items-center gap-1 rounded-lg pr-1 hover:bg-accent max-md:min-h-12';

/**
 * 한 문서의 페이지 트리를 한곳에서 관리한다(문서 사이드바의 톱니에서 라우트 마스킹 다이얼로그로 연다). 손잡이로 같은 층의
 * 순서를 바꾸고, 행의 …에서 하위 페이지 추가·이름 바꾸기·다른 위치로 옮기기·삭제를 한다. 맨 위 문서 자체는 옮기거나 지우지 않는다.
 */
export function DocumentPagesManager({ projectKey, documentId, crumbs, surface = 'page', onClose, onExpand }: DetailSurfaceOptions & { projectKey: string; documentId: string; crumbs: Crumb[] }) {
  const client = useQueryClient();
  const library = useQuery(libraryOptions(projectKey));
  const [draft, setDraft] = useState<Draft>(null);
  const [moving, setMoving] = useState<DocumentRow>();
  const [deleting, setDeleting] = useState<DocumentRow>();
  const [failure, setFailure] = useState<string>();
  const refresh = () => client.invalidateQueries({ queryKey: ['documents'] });
  const create = useCreateBoxDocument(() => { setDraft(null); void refresh(); });
  const rename = useRenameDocument(() => { setDraft(null); void refresh(); });
  const remove = useDeleteDocument(() => { setDeleting(undefined); void refresh(); });
  const data = library.data;
  const byId = new Map((data?.pages ?? []).map(page => [page.id, page]));
  const ordered = [...(data?.order.ids ?? []).filter(id => byId.has(id)), ...(data?.pages ?? []).map(page => page.id).filter(id => !data?.order.ids.includes(id))]
    .map(id => byId.get(id)!);
  let root = byId.get(documentId);
  const seen = new Set<string>();
  while (root?.parentId && !seen.has(root.id)) { seen.add(root.id); const parent = byId.get(root.parentId); if (!parent) break; root = parent; }
  const title = root ? `${root.title} 페이지 관리` : '페이지 관리';
  const said = (reason: unknown) => setFailure(reason instanceof Error ? reason.message : '저장하지 못했습니다.');
  const order = async (ids: string[], parentId: string) => {
    const current = await client.query({ ...libraryOptions(projectKey), staleTime: 0 });
    await saveDocumentOrder(projectKey, ids, current.order.version, parentId);
    await refresh();
  };
  const manage: Manage = {
    pages: ordered, draft, setDraft, busy: create.isPending || rename.isPending,
    create: (parentId, text, mark) => { if (text.trim()) create.mutate({ projectKey, parentId, kind: 'PAGE', title: text, mark: { icon: mark?.icon ?? 'document', color: mark?.color ?? null } }); },
    rename: (page, text) => { if (text.trim() && text.trim() !== page.title) rename.mutate({ document: page, title: text }); else setDraft(null); },
    onMove: setMoving, onDelete: page => { remove.reset(); setDeleting(page); }, order, onError: said,
  };
  const error = failure ?? create.error?.message ?? rename.error?.message;
  return <DetailSurface surface={surface} onClose={onClose} onExpand={onExpand} crumbs={pageCrumbs([...crumbs, { label: title }])} title={title}>
    <div className={cn('flex flex-1 flex-col', surface !== 'dialog' && 'bg-background')}>
      <div className={cn('mx-auto flex w-full flex-col gap-3', surface !== 'dialog' && 'max-w-180 px-4 pt-4 pb-8')}>
        {library.isError ? <PageState isCompact kind="error" title="페이지를 불러오지 못했습니다" description={library.error.message} />
          : !data ? <p className="text-muted-foreground">페이지를 불러오는 중입니다</p>
            : !root ? <PageState isCompact kind="not-found" title="문서를 찾을 수 없습니다" />
              : !data.canManage ? <PageState isCompact kind="empty" title="페이지를 관리할 권한이 없습니다" />
                : <ManageContext value={manage}>
                  <div className="flex flex-col gap-2">
                    {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
                    <div className="flex min-h-10 items-center gap-2 border-b px-2">
                      <MarkIcon name={root.icon ?? 'document'} className="size-4 shrink-0 text-icon-muted" />
                      <span className="min-w-0 flex-1 truncate font-semibold">{root.title}</span>
                      <Button variant="secondary" size="sm" onClick={() => setDraft({ kind: 'new', parentId: root!.id })}><PlusIcon data-icon="inline-start" />새 페이지</Button>
                    </div>
                    <ManagedPages parentId={root.id} />
                  </div>
                </ManageContext>}
      </div>
    </div>
    {moving && data ? <MovePageDialog projectKey={projectKey} document={moving} pages={data.pages} onDone={() => { setMoving(undefined); void refresh(); }} onClose={() => setMoving(undefined)} /> : null}
    <ConfirmDialog open={!!deleting} onOpenChange={open => { if (!open) setDeleting(undefined); }}
      title={`'${deleting?.title ?? ''}' 페이지를 삭제할까요?`} description={remove.error?.message ?? '이 페이지와 그 아래의 하위 페이지를 함께 삭제합니다.'}
      action={{ label: '삭제', isPending: remove.isPending, onAction: () => { if (deleting) remove.mutate({ document: deleting }); } }} />
  </DetailSurface>;
}

/** 한 층의 페이지들: 손잡이로 순서를 바꾸고, 그 아래 층을 들여 그린다. 새 페이지 입력은 그 층의 끝에 놓인다. */
function ManagedPages({ parentId }: { parentId: string }) {
  const manage = useManage();
  const siblings = manage.pages.filter(page => page.parentId === parentId);
  const reorder = useRowReorder(siblings.map(page => ({ id: page.id, name: page.title })), { word: '페이지', object: '페이지를', topic: '페이지는' },
    rows.ghost, ids => manage.order(ids, parentId), manage.onError);
  const isAdding = manage.draft?.kind === 'new' && manage.draft.parentId === parentId;
  if (!siblings.length && !isAdding) return null;
  return <div ref={reorder.list} className="flex min-w-0 flex-col gap-1">
    <p id={reorder.hint} className={rows.spoken}>손잡이를 끌거나 Alt와 위아래 화살표로 페이지 순서를 바꿉니다.</p>
    <p role="status" aria-live="polite" className={rows.spoken}>{reorder.said}</p>
    {reorder.order.map(id => {
      const page = siblings.find(each => each.id === id);
      if (!page) return null;
      return <div key={id} {...reorder.rowProps(id)} className={cn(rows.row, 'flex flex-col gap-1')}>
        <ManagedRow page={page} grip={<button type="button" className={rows.grip} {...reorder.gripProps({ id, name: page.title })}><GripIcon /></button>} />
        <div className="pl-4"><ManagedPages parentId={id} /></div>
      </div>;
    })}
    {isAdding ? <TitleInput label="새 페이지 제목" initial="" withMark onDone={(text, mark) => manage.create(parentId, text, mark)} /> : null}
  </div>;
}

function ManagedRow({ page, grip }: { page: DocumentRow; grip: ReactNode }) {
  const manage = useManage();
  if (manage.draft?.kind === 'rename' && manage.draft.id === page.id)
    return <TitleInput label="페이지 이름" initial={page.title} onDone={text => manage.rename(page, text)} />;
  const actions: MenuAction[] = [
    { id: 'child', label: '하위 페이지 추가', icon: PlusIcon, onSelect: () => manage.setDraft({ kind: 'new', parentId: page.id }) },
    { id: 'rename', label: '이름 바꾸기', icon: PenSquareIcon, onSelect: () => manage.setDraft({ kind: 'rename', id: page.id }) },
    { id: 'move', label: '다른 위치로 옮기기', icon: FolderIcon, onSelect: () => manage.onMove(page) },
    { id: 'delete', label: '삭제', icon: Trash2Icon, onSelect: () => manage.onDelete(page) },
  ];
  return <div className={ROW}>
    {grip}
    <span className="grid w-6 shrink-0 place-items-center text-icon-muted"><MarkIcon name={page.icon ?? 'document'} className="size-4" /></span>
    <span className="min-w-0 flex-1 truncate">{page.title}</span>
    <RowMenu label={`${page.title} 메뉴`} actions={actions} />
  </div>;
}

/** 이름 입력 줄: Enter로 저장, Esc로 취소. 새 페이지를 만들 때는(withMark) 이름 앞에서 표식(아이콘·색)도 고른다. */
function TitleInput({ label, initial, withMark = false, onDone }: {
  label: string; initial: string; withMark?: boolean; onDone: (text: string, mark?: { icon: string | null; color: string | null }) => void;
}) {
  const manage = useManage();
  const [text, setText] = useState(initial);
  const [mark, setMark] = useState<{ icon: string | null; color: string | null }>({ icon: 'document', color: null });
  const submit = () => onDone(text, withMark ? mark : undefined);
  return <div className={cn(ROW, 'gap-2 hover:bg-transparent')}>
    {withMark ? <MarkPicker label="새 페이지 표식" value={{ icon: mark.icon ?? 'document', color: mark.color }} isDisabled={manage.busy}
      onChange={next => setMark({ icon: next.icon, color: next.color })} /> : null}
    <Input aria-label={label} placeholder={label} value={text} autoFocus disabled={manage.busy} className="min-w-0 flex-1"
      onChange={event => setText(event.target.value.slice(0, 200))}
      onKeyDown={event => {
        if (event.key === 'Enter' && !event.nativeEvent.isComposing) { event.preventDefault(); submit(); }
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); manage.setDraft(null); }
      }} />
    <Button size="sm" disabled={!text.trim() || manage.busy} onClick={submit}>{manage.busy ? <Spinner data-icon="inline-start" /> : null}저장</Button>
    <Button variant="ghost" size="sm" onClick={() => manage.setDraft(null)}>취소</Button>
  </div>;
}
