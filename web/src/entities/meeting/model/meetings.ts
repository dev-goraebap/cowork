import { dayStamp, stampText } from '@/shared/lib/date-stamp';
/** How far a meeting's minutes are, as client/ says it, and its token's colour. */
export const MEETING_STATUS: Record<string, { label: string; color: 'gray' | 'blue' | 'green' | 'red' }> = {
  UPLOADED: { label: '대기 중', color: 'gray' },
  TRANSCRIBING: { label: '받아쓰는 중', color: 'blue' },
  SUMMARIZING: { label: '회의록 작성 중', color: 'blue' },
  COMPLETED: { label: '완료', color: 'green' },
  FAILED: { label: '실패', color: 'red' },
};
export const statusOf = (status: string) => MEETING_STATUS[status] ?? { label: status, color: 'gray' as const };

const zone = { timeZone: 'Asia/Seoul' } as const;
const dateFormat = new Intl.DateTimeFormat('ko-KR', { ...zone, year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });
export const dateTimeText = (value?: string | null) => (value ? dateFormat.format(new Date(value)) : '');

/** A wall-clock time on the company's clock (YYYY-MM-DDTHH:mm[:ss]) as the moment it is in Seoul. */
const seoul = (wallClock: string) => new Date(`${wallClock.slice(0, 16)}:00+09:00`);
const dayParts = new Intl.DateTimeFormat('ko-KR', { ...zone, year: 'numeric', month: 'numeric', day: 'numeric', weekday: 'short' });
/** 2026년 10월 12일 (월), as the app writes days. */
const dayText = (at: Date) => {
  const part = Object.fromEntries(dayParts.formatToParts(at).map(item => [item.type, item.value]));
  return `${part.year}년 ${part.month}월 ${part.day}일 (${part.weekday})`;
};
const clockFormat = new Intl.DateTimeFormat('ko-KR', { ...zone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

/** When a meeting was held: `2026년 10월 12일 (월) 10:00 – 11:00`, the day alone with 종일 for a whole day. */
export function heldText(held: { start?: string | null; end?: string | null; allDay?: boolean | null }): string {
  if (!held.start) return '';
  const day = dayText(seoul(held.start));
  if (held.allDay) return `${day} 종일`;
  const from = clockFormat.format(seoul(held.start));
  if (!held.end) return `${day} ${from}`;
  const sameDay = held.end.slice(0, 10) === held.start.slice(0, 10);
  return `${day} ${from} – ${sameDay ? '' : `${dayText(seoul(held.end))} `}${clockFormat.format(seoul(held.end))}`;
}

/**
 * A row's 회의 일시, short (yyyy-mm-dd HH:mm on the company's clock, the table's stamp): when it was held, or when it came
 * in for a meeting without a time. A whole-day meeting shows its day and 종일.
 */
export function rowHeldText(item: { heldStart?: string; heldAllDay?: boolean; createdAt: string }): string {
  const at = item.heldStart ? seoul(item.heldStart) : new Date(item.createdAt);
  return item.heldAllDay ? `${dayStamp(at)} 종일` : stampText(at);
}

/** 83,000ms → "1:23"; an hour or more shows hours too. */
export function clockText(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = String(seconds % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

/** The transcript as plain text, one line per segment with its time and speaker, for saving as a file. */
export function transcriptText(title: string, segments: readonly { speaker?: string; startMs: number; text: string }[]): string {
  const lines = segments.map(segment => `[${clockText(segment.startMs)}]${segment.speaker ? ` ${segment.speaker}` : ''} ${segment.text}`);
  return `${title}\n\n${lines.join('\n')}\n`;
}
