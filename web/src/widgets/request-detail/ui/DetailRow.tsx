import type { ReactNode } from 'react';

/**
 * One row of a request's section (SettingsSection parts the rows with lines): what leads it (an avatar, a LeadIcon), its
 * name over its line, and at the end what it comes to (a status, a value). A long value (a reason) sits under the name.
 */
export function DetailRow({ label, description, start, end }: { label: ReactNode; description?: ReactNode; start?: ReactNode; end?: ReactNode }) {
  return <div className="flex min-h-11 items-center gap-3 p-3">
    {start ? <div className="flex shrink-0 items-center">{start}</div> : null}
    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
      <div className="text-sm">{label}</div>
      {description ? <div className="flex flex-col gap-0.5 text-sm text-muted-foreground">{description}</div> : null}
    </div>
    {end ? <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 text-sm">{end}</div> : null}
  </div>;
}
