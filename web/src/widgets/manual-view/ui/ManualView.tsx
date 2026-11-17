import { useRef } from 'react';
import { useIsMobile } from '@/shared/lib/use-mobile';
import type { Manual } from '../model/types';
import { useActiveSection } from '../model/use-active-section';
import { ManualDocument } from './ManualDocument';
import { ManualToc, type TocItem } from './ManualToc';
import { ManualTocButton } from './ManualTocButton';

/**
 * A guide to read, as BIT's manuals and Notion: on a desktop its table of contents on the left (the section being read
 * marked) beside the document at a reading measure, which scrolls on its own; on a phone one column under a row with a
 * table of contents button, which opens the sections in a bottom sheet.
 */
export function ManualView({ manual }: { manual: Manual }) {
  const isPhone = useIsMobile();
  const scroll = useRef<HTMLElement>(null);
  const ids = manual.sections.map(section => section.id);
  const current = useActiveSection(scroll, isPhone ? ids : []);
  const go = (id: string) => scroll.current?.querySelector<HTMLElement>(`[id="${id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const body = <section ref={scroll} className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain" aria-label={manual.title}><ManualDocument manual={manual} /></section>;
  if (isPhone) return <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
    <div className="flex min-h-13 flex-none items-center border-b px-4">
      <ManualTocButton sections={manual.sections} current={current} onGo={go} />
    </div>
    {body}
  </div>;
  const items: TocItem[] = manual.sections.flatMap(section => [
    { id: section.id, label: section.title, level: 2 as const },
    ...section.blocks.flatMap(block => (block.kind === 'heading' ? [{ id: block.id, label: block.text, level: 3 as const }] : [])),
  ]);
  return <div className="flex h-full min-h-0 min-w-0 flex-1">
    <ManualToc items={items} scroll={scroll} />
    {body}
  </div>;
}
