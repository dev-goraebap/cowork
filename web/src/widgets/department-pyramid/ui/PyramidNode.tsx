import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { memo } from 'react';
import { cn } from 'cn';
import { Badge } from '@/shared/ui/badge';
import { PersonAvatar } from '@/shared/ui/person';
import type { DepartmentBox } from '../model/pyramid-layout';

export type PyramidFlowNode = Node<{ box: DepartmentBox }, 'department'>;

/** Handles only fix where lines end; drawing new ones is off, so they stay unseen. */
const HANDLE = 'pointer-events-none opacity-0';
/** One roster line, 1.625rem as BOX.line in pyramid-layout. */
const LINE = 'flex h-6.5 min-w-0 items-center gap-1.5 text-xs';

/**
 * A department as a box: its name, its size and how many departments sit directly below it, then its people one to a
 * line, the lead first and marked, up to ten, with how many more there are. Pressing it selects it. Heights match BOX in
 * pyramid-layout (rem): a 3.625rem head (0.625rem pad, name and size 2.625rem, 0.375rem gap), 1.625rem lines, a 0.625rem foot.
 */
export const PyramidNode = memo(function PyramidNode({ data, selected }: NodeProps<PyramidFlowNode>) {
  const { department, childCount, memberCount, roster } = data.box;
  return <section aria-label={department.name} data-selected={selected || undefined}
    className={cn('flex size-full min-w-0 cursor-pointer flex-col rounded-xl border px-3 py-2.5 text-card-foreground hover:border-ring',
      department.depth === 0 ? 'bg-muted' : 'bg-card', 'data-selected:border-ring data-selected:ring-3 data-selected:ring-ring/25',
      'group-focus-visible/node:border-ring group-focus-visible/node:ring-3 group-focus-visible/node:ring-ring/50')}>
    <Handle type="target" position={Position.Top} className={HANDLE} isConnectable={false} />
    <Handle type="source" position={Position.Bottom} className={HANDLE} isConnectable={false} />
    <header className="mb-1.5 flex h-10.5 min-w-0 flex-col justify-center">
      <h3 className="truncate text-sm font-semibold">{department.name}</h3>
      <p className="text-xs text-muted-foreground tabular-nums">{memberCount}명{childCount > 0 ? ` · 하위 ${childCount}개` : ''}</p>
    </header>
    <ul className="flex min-w-0 flex-col">
      {roster.hasLead ? null : <li className={cn(LINE, 'text-muted-foreground')}>부서장 미지정</li>}
      {roster.lines.map(line => <li key={line.id} className={LINE}>
        <PersonAvatar id={line.id} name={line.name} size={16} isStatic />
        <span className="min-w-0 flex-1 truncate">{line.name}{line.rank ? <span className="text-muted-foreground"> · {line.rank}</span> : null}</span>
        {line.isLead ? <Badge variant="label">부서장</Badge> : null}
      </li>)}
      {roster.more > 0 ? <li className={cn(LINE, 'text-muted-foreground tabular-nums')}>외 {roster.more}명</li> : null}
    </ul>
  </section>;
});
