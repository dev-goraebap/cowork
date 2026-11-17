import { cn } from 'cn';
import { LabelDot } from '@/shared/ui/label-dot/LabelDot';
import { MarkIcon, markTone } from '@/shared/ui/mark-picker';
import { useWorkItemTypes } from '../api/types';
import type { ColumnCategory, WorkItemPriority, WorkItemType } from '../model/types';
import { categoryMark, priorityMark } from '../model/words';

/**
 * A status as its category's 16px icon in its colour. Given a label (the column's name) it is named for a screen reader;
 * without one it is a picture beside a name already written (an option, a row of settings), so it is not read twice.
 */
export function WorkItemStatusIcon({ category, label, className }: { category: ColumnCategory; label?: string; className?: string }) {
  const mark = categoryMark(category);
  if (!label) return <mark.icon aria-hidden className={cn('shrink-0', mark.tone, className)} />;
  return <mark.icon role="img" aria-hidden={false} aria-label={label} className={cn('shrink-0', mark.tone, className)} />;
}

/** A priority's own mark: graded bars, dashes for none, and Solar's siren for urgent. */
export function WorkItemPriorityIcon({ priority = 'NONE', className }: { priority?: WorkItemPriority; className?: string }) {
  const mark = priorityMark(priority);
  const label = priority === 'NONE' ? '우선순위 없음' : mark.label;
  const classes = cn('shrink-0', mark.tone, className);
  if (priority === 'URGENT') return <mark.icon role="img" aria-hidden={false} aria-label={label} className={classes} />;
  const level = priority === 'HIGH' ? 3 : priority === 'MEDIUM' ? 2 : 1;
  return <svg viewBox="0 0 24 24" width="1rem" height="1rem" className={classes} role="img" aria-label={label} focusable="false">
    {priority === 'NONE'
      ? <path d="M3 12h3 M10.5 12h3 M18 12h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      : [7, 12, 18].map((height, index) => <rect key={height} x={3 + index * 7} y={21 - height} width="4" height={height} rx="1"
        fill="currentColor" opacity={index < level ? 1 : 0.24} />)}
  </svg>;
}

/**
 * A work item's type as its 16px mark icon in the type's own colour (a mark the workspace keeps, 프로젝트 관리 › 업무 유형),
 * named for a screen reader; a plain checklist while the types are read. showsLabel puts the type's name beside it.
 */
export function WorkItemTypeIcon({ type, showsLabel = false, className }: { type: WorkItemType; showsLabel?: boolean; className?: string }) {
  const found = useWorkItemTypes().typeOf(type);
  const name = found?.name ?? '업무';
  // check-ui: allow-style 유형의 색은 관리자가 고른 데이터다.
  const icon = <MarkIcon name={found?.icon ?? 'checklist'} style={markTone(found?.color)} role="img" aria-hidden={showsLabel} aria-label={name}
    className={cn('size-4 shrink-0', found?.color ? 'text-(--mark)' : 'text-icon-muted', !showsLabel && className)} />;
  if (!showsLabel) return icon;
  return <span className={cn('flex min-w-0 shrink-0 items-center gap-1 text-xs text-muted-foreground', className)}>
    {icon}
    <span className="truncate">{name}</span>
  </span>;
}

/** A label's exact saved colour as a dot. */
export function WorkItemLabelDot({ color }: { color?: string }) { return <LabelDot color={color} />; }
