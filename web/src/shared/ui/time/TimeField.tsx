import { useEffect, useRef, useState } from 'react';
import { cn } from 'cn';
import { Button } from '@/shared/ui/button';
import { ClockIcon } from '@/shared/ui/icon';
import { Input } from '@/shared/ui/input';
import { AdaptivePopover } from '../popup/AdaptivePopover';

/** 'HH:mm' as minutes from midnight. */
const minutesOf = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
const clockOf = (total: number) => `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;

/** How long from one time to another, as the list says it beside an end: 30분, 1시간, 1시간 30분. */
export function lengthText(from: string, to: string): string {
  const length = (minutesOf(to) - minutesOf(from) + 24 * 60) % (24 * 60);
  const hours = Math.floor(length / 60);
  const rest = length % 60;
  return [hours ? `${hours}시간` : '', rest ? `${rest}분` : ''].filter(Boolean).join(' ') || '0분';
}

/**
 * What was typed as 'HH:mm' in 24 hours: 9, 930, 0930, 9:30 and 09:30 all read as 09:30; anything else is not a time.
 * The browser's own time box would follow the device's clock (오전/오후), so the field reads its digits itself.
 */
export function parseTime(text: string): string | undefined {
  const digits = text.trim().replace(/[^\d:]/g, '');
  const match = /^(\d{1,2}):?(\d{2})?$/.exec(digits.includes(':') ? digits : digits.length > 2 ? `${digits.slice(0, -2)}:${digits.slice(-2)}` : digits);
  if (!match) return undefined;
  const hours = Number(match[1]);
  const minutes = Number(match[2] ?? 0);
  return hours < 24 && minutes < 60 ? clockOf(hours * 60 + minutes) : undefined;
}

/** How a field shows what is wrong with it, as the old fields took it: an error marks it invalid. */
export type TimeFieldStatus = { type: 'error' | 'warning' | 'success' | 'info'; message?: string };

/**
 * A time of day (DESIGN.md 시간), wherever one is asked for: typed into the field (24h, read when it loses focus or on
 * Enter), or picked from the day's times every step minutes in a list beside it (the clock), the one chosen in the middle
 * of it. An end (from: its start) lists the times after the start with how long each makes it (1시간 30분). Values are 'HH:mm'.
 */
export function TimeField({ label, value, onChange, from, step = 30, size = 'md', width, placeholder = '--:--', status }: {
  label: string; value?: string; onChange: (time: string | undefined) => void; from?: string;
  step?: 15 | 30 | 60; size?: 'sm' | 'md';
  /** Only 100% (the column's width) is kept; otherwise the field takes its own. */
  width?: string;
  placeholder?: string; status?: TimeFieldStatus;
}) {
  const [isOpen, setOpen] = useState(false);
  const [draft, setDraft] = useState<string>();
  const chosen = useRef<HTMLButtonElement>(null);
  const start = from ? minutesOf(from) + step : 0;
  const times = Array.from({ length: (24 * 60) / step }, (_, at) => clockOf(start + at * step));
  // The list opens on the time chosen, or on the start's hour for an end, or on 9:00.
  const near = value ?? (from ? clockOf(start) : '09:00');
  useEffect(() => {
    if (isOpen) requestAnimationFrame(() => chosen.current?.scrollIntoView({ block: 'center' }));
  }, [isOpen]);
  const commit = () => {
    if (draft === undefined) return;
    setDraft(undefined);
    if (!draft.trim()) { onChange(undefined); return; }
    const time = parseTime(draft);
    // What cannot be read as a time is let go, and the field shows the time it had.
    if (time) onChange(time);
  };
  const isSmall = size === 'sm';
  return <div className={cn('flex items-center gap-1', width === '100%' && 'w-full')}>
    <Input aria-label={label} inputMode="numeric" autoComplete="off" placeholder={placeholder} value={draft ?? value ?? ''}
      aria-invalid={status?.type === 'error' || undefined} className={cn('min-w-0 flex-1 tabular-nums', isSmall ? 'md:h-7' : 'w-24')}
      onChange={event => setDraft(event.target.value)} onBlur={commit}
      onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); commit(); } }} />
    <AdaptivePopover label={`${label} 고르기`} width="12rem" sheetHeight="tall" alignment="end" onOpenChange={setOpen}
      trigger={<Button variant="ghost" size={isSmall ? 'icon-sm' : 'icon'} aria-label={`${label} 목록`} title="시간 고르기" className="max-md:size-11">
        <ClockIcon chosen={isOpen} />
      </Button>}
      content={close => <ul role="listbox" aria-label={`${label} 고르기`} className="flex max-h-72 flex-col overflow-y-auto max-md:max-h-none">
        {times.map(time => {
          const isChosen = time === value;
          return <li key={time}>
            <button type="button" role="option" aria-selected={isChosen} data-chosen={isChosen || undefined}
              ref={time === (times.includes(near) ? near : times[0]) ? chosen : undefined}
              onClick={() => { setDraft(undefined); onChange(time); close(); }}
              className="flex h-8 w-full items-center justify-between gap-2 rounded-md px-2 text-left text-sm outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring data-chosen:bg-accent data-chosen:font-medium max-md:h-12">
              <span className="tabular-nums">{time}</span>
              {from ? <span className="text-xs text-muted-foreground">{lengthText(from, time)}</span> : null}
            </button>
          </li>;
        })}
      </ul>} />
  </div>;
}
