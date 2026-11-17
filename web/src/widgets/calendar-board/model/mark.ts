import type { ReactElement, ReactNode } from 'react';
import type { CalendarEvent } from '@/entities/event';

/** A mark's button as a view draws it (a bar, a timed line, a block, an agenda row). */
export type MarkTrigger = ReactElement<{ onClick?: () => void }>;

/**
 * What a view puts round a mark's button so pressing it opens the mark: its detail, in a dialog over the calendar on a
 * desktop and on its own page on a phone. A view without it draws the button alone.
 */
export type MarkWrap = (event: CalendarEvent, trigger: MarkTrigger) => ReactNode;
