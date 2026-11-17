import type { ReactNode } from 'react';
import { cn } from 'cn';
import { ChevronDownIcon } from '@/shared/ui/icon';

/**
 * The shared sticky group band: chevron, mark, name and count, with optional group actions at its end. The kit's
 * ListGroupHeader (@/shared/ui/list-group-header) draws the same band with only a + at its end; this one takes any actions.
 * 36px on a desktop and 52px on a phone; the band (bg-band) is opaque, so the rows passing under it do not show through.
 */
export function ListGroupHeader({ label, count, icon, isOpen, onToggle, actions }: {
  label: string; count: number; icon?: ReactNode; isOpen: boolean;
  /** Kept for the callers of the old API: the band sizes itself to the screen. */
  isPhone?: boolean;
  onToggle: () => void; actions?: ReactNode;
}) {
  return <header className="sticky top-0 z-10 flex h-13 shrink-0 items-center justify-between gap-2 border-b bg-band px-2 md:h-9">
    <button type="button" aria-expanded={isOpen} aria-label={`${label} ${count}개`} onClick={onToggle}
      className="flex h-6 items-center gap-2 rounded-full px-2 text-sm font-medium outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 max-md:h-11">
      <ChevronDownIcon className={cn('shrink-0 transition-transform', !isOpen && '-rotate-90')} />
      {icon}
      <span>{label}</span>
      <span className="font-normal text-muted-foreground tabular-nums">{count}</span>
    </button>
    {actions}
  </header>;
}
