import { cn } from 'cn';
import type { EventColor } from '../model/types';

/*
 * An event's colour as two custom properties a mark paints with: --event-fill for a bar's or a block's ground and
 * --event-ink for type or a dot on it. The theme's event colours (bg-event-* · text-event-*-foreground), so a colour reads
 * alike in light and dark; a mark mixes its own hover from them.
 */
const TONES: Record<EventColor, string> = {
  blue: '[--event-fill:var(--event-blue)] [--event-ink:var(--event-blue-foreground)]',
  green: '[--event-fill:var(--event-green)] [--event-ink:var(--event-green-foreground)]',
  orange: '[--event-fill:var(--event-orange)] [--event-ink:var(--event-orange-foreground)]',
  purple: '[--event-fill:var(--event-purple)] [--event-ink:var(--event-purple-foreground)]',
  red: '[--event-fill:var(--event-red)] [--event-ink:var(--event-red-foreground)]',
  teal: '[--event-fill:var(--event-teal)] [--event-ink:var(--event-teal-foreground)]',
  pink: '[--event-fill:var(--event-pink)] [--event-ink:var(--event-pink-foreground)]',
  yellow: '[--event-fill:var(--event-yellow)] [--event-ink:var(--event-yellow-foreground)]',
  gray: '[--event-fill:var(--event-gray)] [--event-ink:var(--event-gray-foreground)]',
};

/** The class that sets a mark's colour variables (--event-fill · --event-ink); blue when the event has none. */
export const eventTone = (color?: EventColor) => TONES[color ?? 'blue'];

/** A small round mark in an event's colour (decorative: the event's name is beside it). */
export function EventDot({ color, className }: { color?: EventColor; className?: string }) {
  return <span aria-hidden className={cn(eventTone(color), 'size-[0.4375rem] shrink-0 rounded-full bg-(--event-ink)', className)} />;
}
