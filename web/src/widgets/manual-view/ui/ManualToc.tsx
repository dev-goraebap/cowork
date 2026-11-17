import type { RefObject } from 'react';
import { useTocSpy } from '@/shared/lib/toc-spy';
import { cn } from 'cn';

export type TocItem = { id: string; label: string; level: 2 | 3 };

/**
 * A desktop's table of contents beside the document: the sections and their headings, the one being read marked as the
 * document scrolls; pressing one scrolls to it. 고르는 규칙은 useTocSpy: 누른 제목은 직접 스크롤할 때까지 지키고, 문서 끝의 짧은
 * 절들은 남은 스크롤을 나눠 차례로 고른다.
 */
export function ManualToc({ items, scroll }: { items: TocItem[]; scroll: RefObject<HTMLElement | null> }) {
  const [activeId, pin] = useTocSpy(items.map(item => item.id), scroll);
  const go = (id: string) => {
    pin(id);
    scroll.current?.querySelector<HTMLElement>(`[id="${id}"]`)?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  };
  return <aside aria-label="목차" className="flex w-60 flex-none flex-col gap-2 overflow-y-auto border-r px-3 py-6">
    <p className="px-2 text-xs font-medium text-muted-foreground">목차</p>
    <nav aria-label="목차" className="flex flex-col">
      {items.map(item => <button key={item.id} type="button" aria-current={item.id === activeId ? 'location' : undefined} onClick={() => go(item.id)}
        className={cn('flex min-h-8 items-center rounded-lg px-2 py-1 text-left text-sm text-muted-foreground hover:bg-muted hover:text-foreground',
          'aria-[current=location]:font-medium aria-[current=location]:text-foreground', item.level === 3 && 'pl-5')}>
        <span className="line-clamp-2">{item.label}</span>
      </button>)}
    </nav>
  </aside>;
}
