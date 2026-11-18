import { useState, type MouseEvent, type ReactNode } from 'react';
import type { DocumentRow } from '@/entities/document';
import { useStoredWidth } from '@/shared/lib/use-stored-width';
import { cn } from 'cn';
import { Button } from '@/shared/ui/button';
import { ChevronDownIcon, ChevronRightIcon, SettingsIcon } from '@/shared/ui/icon';
import { MarkIcon } from '@/shared/ui/mark-picker';
import { PaneResizeHandle } from '@/shared/ui/pane-resize-handle';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip';
import { TREE_LINK } from './DocumentPages';

const NAV_MIN = 220;
const NAV_MAX = 440;

/**
 * 본문이 비어 있고 하위 페이지만 묶는 페이지: 사이드바에서 누를 항목이 아니라 구역 제목이다. 따로 설정하지 않고 본문으로
 * 판단하므로, 그 페이지에 본문을 쓰면 다시 누를 수 있는 항목이 된다.
 */
export const isSectionPage = (page: DocumentRow, pages: readonly DocumentRow[]) =>
  !page.excerpt?.trim() && pages.some(each => each.parentId === page.id);

/** 맨 위 문서의 하위를 차례대로 묶는다: 구역 페이지는 제목과 그 하위, 나머지는 이어진 것끼리 제목 없는 묶음. */
function groupsOf(children: DocumentRow[], pages: DocumentRow[]) {
  const groups: { section?: DocumentRow; items: DocumentRow[] }[] = [{ items: [] }];
  for (const page of children) {
    if (isSectionPage(page, pages)) groups.push({ section: page, items: pages.filter(each => each.parentId === page.id) });
    else if (groups.at(-1)!.section) groups.push({ items: [page] });
    else groups.at(-1)!.items.push(page);
  }
  return groups;
}

function ToolButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return <Tooltip>
    <TooltipTrigger render={<Button variant="ghost" size="icon-sm" aria-label={label} onClick={onClick} />}>{children}</TooltipTrigger>
    <TooltipContent>{label}</TooltipContent>
  </Tooltip>;
}

type Nav = { pages: DocumentRow[]; base: string; currentId: string; open: (id: string) => (event: MouseEvent) => void };

function PageLink({ page, nav }: { page: DocumentRow; nav: Nav }) {
  const isCurrent = page.id === nav.currentId;
  return <a href={`${nav.base}/${page.id}`} aria-current={isCurrent ? 'page' : undefined} className={TREE_LINK} onClick={nav.open(page.id)}>
    <MarkIcon name={page.icon ?? 'document'} isChosen={isCurrent} className={cn('size-4 shrink-0', !isCurrent && 'text-icon-muted')} />
    <span className="truncate">{page.title}</span>
  </a>;
}

/** 페이지 하나와 그 하위. 하위가 있으면 끝에 접기 단추가 있고, 처음에는 펼쳐 둔다. */
function PageItem({ page, nav }: { page: DocumentRow; nav: Nav }) {
  const [isOpen, setOpen] = useState(true);
  const children = nav.pages.filter(each => each.parentId === page.id);
  return <li className="flex flex-col gap-0.5">
    <div className="flex items-center gap-0.5">
      <PageLink page={page} nav={nav} />
      {children.length ? <Button variant="ghost" size="icon-xs" aria-expanded={isOpen} aria-label={`${page.title} 하위 페이지 ${isOpen ? '접기' : '펼치기'}`}
        className="text-icon-muted max-md:size-11" onClick={() => setOpen(!isOpen)}>
        {isOpen ? <ChevronDownIcon /> : <ChevronRightIcon />}
      </Button> : null}
    </div>
    {children.length && isOpen ? <ul className="flex flex-col gap-0.5 pl-4">{children.map(child => <PageItem key={child.id} page={child} nav={nav} />)}</ul> : null}
  </li>;
}

/**
 * 하위 페이지가 있는 문서의 페이지 메뉴(앱 사이드바와 같은 줄 모양 · 선택 표시 · 구역 제목 · 접기). 맨 위 문서가 첫 항목이고, 본문 없이
 * 하위만 묶는 1단계 페이지는 구역 제목(앱 사이드바의 '관리'처럼)이 되어 그 하위를 들여쓰기 없이 늘어놓는다. 손잡이나 추가 버튼은
 * 두지 않고, 관리는 머리 줄의 톱니(onManage)가 여는 페이지 관리에서 한다. 바탕은 본문과 같은 면이고(앱 바닥색과 구분된다) 선으로 나눈다. 머리 줄은 옆 페이지 머리 줄과 같은 높이 · 아래 선이고,
 * 오른쪽 가장자리를 끌어 너비를 바꾼다(이 브라우저에 남는다).
 */
export function DocumentSideNav({ root, pages, currentId, base, onOpen, onManage }: {
  root: DocumentRow; pages: DocumentRow[]; currentId: string; base: string;
  onOpen: (id: string) => void; onManage?: () => void;
}) {
  const [width, resize] = useStoredWidth({ key: 'cowork.document-nav-width', min: NAV_MIN, max: NAV_MAX, initial: 288 });
  const open = (id: string) => (event: MouseEvent) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey) return;
    event.preventDefault();
    onOpen(id);
  };
  const nav: Nav = { pages, base, currentId, open };
  const groups = groupsOf(pages.filter(page => page.parentId === root.id), pages);
  return <>
    {/* check-ui: allow-style 목차 칸의 너비는 사용자가 끌어 정한 값이다. */}
    <aside aria-label={`${root.title} 페이지`} style={{ width }} className="flex min-h-0 shrink-0 flex-col border-r bg-background">
      <header className="flex h-13 shrink-0 items-center justify-between gap-2 border-b pr-2 pl-4">
        <h2 className="text-sm font-semibold">목차</h2>
        <div className="flex items-center gap-0.5">
          {onManage ? <ToolButton label="페이지 관리" onClick={onManage}><SettingsIcon /></ToolButton> : null}
        </div>
      </header>
      <nav aria-label={`${root.title} 목차`} className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-2">
        {groups.map((group, index) => index > 0 && !group.items.length ? null
          : <section key={group.section?.id ?? `pages-${index}`} aria-label={group.section?.title ?? root.title} className="flex flex-col gap-0.5">
            {group.section ? <h3 className="flex h-8 items-center px-2 text-xs font-medium text-muted-foreground">{group.section.title}</h3> : null}
            <ul className="flex flex-col gap-0.5">
              {index === 0 ? <li className="flex"><PageLink page={root} nav={nav} /></li> : null}
              {group.items.map(page => <PageItem key={page.id} page={page} nav={nav} />)}
            </ul>
          </section>)}
      </nav>
    </aside>
    <PaneResizeHandle label="목차 너비" value={width} min={NAV_MIN} max={NAV_MAX} onChange={resize} />
  </>;
}
