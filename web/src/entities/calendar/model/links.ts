/** An address with its query, leaving out the values not given. */
const withQuery = (path: string, query: Record<string, string | null | undefined>) => {
  const params = new URLSearchParams(Object.entries(query).filter((entry): entry is [string, string] => !!entry[1]));
  const text = params.toString();
  return text ? `${path}?${text}` : path;
};

/** The schedule's pages: the calendar, a day, an event (one occurrence of a repeating one), a new one, a leave, an overtime record. */
export const SCHEDULE = '/office/schedule';
export const scheduleHref = (place: { view?: string; date?: string } = {}) => withQuery(SCHEDULE, place);
export const dayHref = (day: string) => `${SCHEDULE}/days/${day}`;
export const eventHref = (event: { id: string; occurrence?: string | null }) => withQuery(`${SCHEDULE}/events/${event.id}`, { occurrence: event.occurrence });
export const eventEditHref = (event: { id: string; occurrence?: string | null }) =>
  withQuery(`${SCHEDULE}/events/${event.id}/edit`, { occurrence: event.occurrence });
/** A new event: on a day, over the times given (HH:mm), for a project (its key), or as a copy of another event's occurrence. */
export const newEventHref = (from: { date?: string; start?: string; end?: string; project?: string; copy?: string; occurrence?: string | null } = {}) =>
  withQuery(`${SCHEDULE}/events/new`, from);
export const leaveHref = (requestId: string) => `${SCHEDULE}/leaves/${requestId}`;
export const overtimeHref = (requestId: string) => `${SCHEDULE}/overtime/${requestId}`;
