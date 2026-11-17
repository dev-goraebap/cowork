import { useState } from 'react';
import { AdaptivePopover } from '@/shared/ui/adaptive-popover';
import { Button } from '@/shared/ui/button';
import { ListIcon } from '@/shared/ui/icon';
import { ActionMenu } from '@/shared/ui/popup';
import type { ManualSection } from '../model/types';

/**
 * A phone's table of contents: a pill naming the section being read, which opens the sections in a bottom sheet
 * (AdaptivePopover: on a phone always a sheet); a choice scrolls to it.
 */
export function ManualTocButton({ sections, current, onGo }: {
  sections: ManualSection[]; current?: string; onGo: (id: string) => void;
}) {
  const [isOpen, setOpen] = useState(false);
  const reading = sections.find(section => section.id === current) ?? sections[0];
  return <AdaptivePopover title="목차" open={isOpen} onOpenChange={setOpen} className="w-72 p-1.5"
    trigger={<Button variant={isOpen ? 'view-active' : 'view'} className="h-11 max-w-full min-w-0">
      <ListIcon chosen={isOpen} data-icon="inline-start" />
      <span className="truncate">{reading ? `목차 · ${reading.title}` : '목차'}</span>
    </Button>}>
    <ActionMenu onDone={() => setOpen(false)} actions={sections.map(section => ({
      id: section.id, label: section.title, icon: section.icon ?? 'document', isChosen: section.id === reading?.id, onSelect: () => onGo(section.id),
    }))} />
  </AdaptivePopover>;
}
