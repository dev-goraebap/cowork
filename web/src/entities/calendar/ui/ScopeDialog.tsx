import { useState } from 'react';
import { cn } from 'cn';
import { FormDialog } from '@/shared/ui/form-dialog';
import type { EventScope } from '../api/calendar';
import { SCOPES } from '../model/recurrence';

/**
 * Asks which occurrences of a repeating event a change or deletion is for. "이 일정만" is held back when the change
 * reaches what only the whole series can have (who is in it, what it says, how it repeats).
 */
export function ScopeDialog({ isOpen, isDelete = false, canThis = true, isPending, error, onConfirm, onClose }: {
  isOpen: boolean; isDelete?: boolean; canThis?: boolean; isPending: boolean; error?: Error | null;
  onConfirm: (scope: EventScope) => void; onClose: () => void;
}) {
  const [scope, setScope] = useState<EventScope>(canThis ? 'THIS' : 'FOLLOWING');
  const chosen = !canThis && scope === 'THIS' ? 'FOLLOWING' : scope;
  return <FormDialog open={isOpen} onOpenChange={open => { if (!open) onClose(); }} isPending={isPending} isDestructive={isDelete}
    title={isDelete ? '반복 일정 삭제' : '반복 일정 저장'} submitLabel={isDelete ? '삭제' : '저장'}
    onSubmit={() => onConfirm(chosen)}>
    <div role="radiogroup" aria-label="적용할 일정" className="flex flex-col gap-1">
      {SCOPES.map(option => {
        const isDisabled = option.value === 'THIS' && !canThis;
        return <label key={option.value} className={cn('flex items-start gap-3 rounded-md px-2 py-2 text-sm hover:bg-row-hover max-md:py-3 max-md:text-base',
          isDisabled && 'pointer-events-none opacity-50')}>
          <input type="radio" name="event-scope" value={option.value} checked={chosen === option.value} disabled={isDisabled}
            onChange={() => setScope(option.value)} className="mt-0.5 size-4 shrink-0 accent-primary" />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span>{option.label}</span>
            {isDisabled ? <span className="text-xs text-muted-foreground">참석자 · 내용 · 반복을 바꾸면 이 일정만 고를 수 없습니다.</span> : null}
          </span>
        </label>;
      })}
    </div>
    {error ? <p role="alert" className="text-sm text-destructive">{error.message}</p> : null}
  </FormDialog>;
}
