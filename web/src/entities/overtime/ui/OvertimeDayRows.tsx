import type { ReactNode } from 'react';
import { Badge } from '@/shared/ui/badge';
import type { OvertimeDay } from '../api/overtime';
import { durationText, overtimeDateText, spanText } from '../model/text';

/**
 * Overtime day by day, one row each, for a ruled box to hold (a SettingsSection, a Card parted by lines): the date (and,
 * when given, the record's status before it), the spans and why, and at the end the time it counts with the break (휴게)
 * left out of it under it.
 */
export function OvertimeDayRows({ days }: { days: { key: string; day: OvertimeDay; status?: ReactNode }[] }) {
  return <>
    {days.map(({ key, day, status }) => {
      const description = [day.segments.map(spanText).join(', '), day.reason].filter(Boolean).join(' · ');
      return <div key={key} className="flex min-h-11 items-center gap-3 p-3">
        {status ? <div className="flex shrink-0 items-center">{status}</div> : null}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-sm">{overtimeDateText(day.date)}</span>
          {description ? <span className="text-sm text-muted-foreground">{description}</span> : null}
        </div>
        <div className="flex shrink-0 flex-col items-end">
          <span className="text-sm font-semibold tabular-nums">{durationText(day.recognizedMinutes)}</span>
          {day.excludedMinutes > 0 ? <span className="text-xs text-muted-foreground">휴게 {durationText(day.excludedMinutes)}</span> : null}
        </div>
      </div>;
    })}
  </>;
}

/**
 * 사후 신청, beside an overtime record asked for after one of its days, so approvers see it was not asked before the
 * work; nothing for one asked in time.
 */
export function LateMark({ overtime }: { overtime: { late?: boolean } }) {
  return overtime.late ? <Badge className="bg-event-orange text-event-orange-foreground">사후 신청</Badge> : null;
}
