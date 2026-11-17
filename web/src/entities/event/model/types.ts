/** An event's colour: one of the theme's categorical colours, so it reads alike in every theme. */
export type EventColor = 'blue' | 'green' | 'orange' | 'purple' | 'red' | 'teal' | 'pink' | 'yellow' | 'gray';

/**
 * A calendar event. A timed one starts and ends at a minute (2026-11-03T10:30); one over whole days gives its first and
 * last day (2026-11-12, 2026-11-14), the last included, and isAllDay.
 */
export type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  isAllDay?: boolean;
  color?: EventColor;
  location?: string;
  /**
   * What the mark stands for. Leave can span multiple days; overtime uses timed rows.
   */
  kind?: 'event' | 'leave' | 'overtime';
};

/** A day off for everyone: its day (2026-11-17) and name. */
export type Holiday = { day: string; name: string };
