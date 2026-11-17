import { cn } from 'cn';
import { Badge } from '@/shared/ui/badge';
import type { ApprovalRequest } from '../api/approval';
import { originLabel, statusColors, statusText } from '../model/status';

/** The colours a status or a kind may take, as the category tokens draw them (a tinted face, its own ink). */
export type Tone = 'blue' | 'green' | 'red' | 'gray' | 'purple' | 'orange';
const TONES: Record<Tone, string> = {
  blue: 'bg-event-blue text-event-blue-foreground',
  green: 'bg-event-green text-event-green-foreground',
  red: 'bg-event-red text-event-red-foreground',
  gray: 'bg-event-gray text-event-gray-foreground',
  purple: 'bg-event-purple text-event-purple-foreground',
  orange: 'bg-event-orange text-event-orange-foreground',
};

/** A short word in a tinted pill (결재 중 1/2, 승인, 결재 요청); the colour only repeats what the word says. */
export function ToneBadge({ label, tone, className }: { label: string; tone: Tone; className?: string }) {
  return <Badge className={cn(TONES[tone], className)}>{label}</Badge>;
}

/**
 * Where a request stands as a pill (결재 중 1/2, 승인 …). A request brought in from elsewhere carries its mark (디스코드
 * 이관) beside it wherever the status shows.
 */
export function ApprovalStatus({ request }: { request: Pick<ApprovalRequest, 'status' | 'currentStep' | 'approvers' | 'origin'> }) {
  const status = <ToneBadge label={statusText(request)} tone={statusColors[request.status] ?? 'gray'} />;
  if (!request.origin) return status;
  return <span className="inline-flex flex-wrap items-center gap-1">{status}<OriginMark origin={request.origin} /></span>;
}

/** 디스코드 이관, beside a record brought in from the chat channel used before the app; nothing for one made in the app. */
export function OriginMark({ origin }: { origin?: string | null }) {
  const label = originLabel(origin);
  return label ? <ToneBadge label={label} tone="purple" /> : null;
}
