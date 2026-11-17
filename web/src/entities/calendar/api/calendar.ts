import { keepPreviousData, queryOptions, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { getJson, sendCommand, sendCreate, type components } from '@/shared/api';

type Schemas = components['schemas'];
/** Some fields required that the server always sends, the generated schema marking every field optional. */
type Sure<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };

export type CalendarLeave = Sure<Schemas['CalendarLeave'], 'requestId' | 'employeeId' | 'typeName' | 'slot' | 'startDate' | 'endDate'>;
export type CalendarHoliday = Sure<Schemas['CalendarHoliday'], 'date' | 'name'>;
export type CalendarOvertime = Sure<Schemas['CalendarOvertime'], 'requestId' | 'employeeId' | 'date' | 'start' | 'end' | 'minutes'>;
export type Visibility = 'COMPANY' | 'PERSONAL';
/**
 * One occurrence of an event in a range; end is exclusive, so an all-day event ends at midnight after its last day.
 * occurrence is when a repeating event's rule puts it, and finds it again after it moved.
 */
export type CalendarEventItem = Sure<Schemas['CalendarEventItem'], 'id' | 'title' | 'allDay' | 'start' | 'end' | 'organizerId'> & { visibility?: Visibility };
export type CalendarFeed = {
  holidays: CalendarHoliday[]; leaves: CalendarLeave[]; overtimes: CalendarOvertime[]; events: CalendarEventItem[]; failedSources: string[];
};

/**
 * How the request behind a leave or overtime went through approval. detailed is true for its requester, its approvers
 * and administrators, who alone are sent when it was asked for and when each approver decided.
 */
export type CalendarApproval = Omit<Schemas['CalendarApproval'], 'approvers'> & { approvers: Schemas['CalendarApprover'][] };
export type CalendarLeaveDetail = CalendarLeave & { approval?: CalendarApproval | null };
export type CalendarOvertimeRecord = { days: CalendarOvertime[]; approval?: CalendarApproval | null };

export type Weekday = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
/** How an event repeats; it ends after count times, on until, or never. */
export type Recurrence = {
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'; interval: number; weekdays: Weekday[];
  monthlyBy?: 'DAY_OF_MONTH' | 'WEEKDAY_OF_MONTH'; count?: number; until?: string;
};
/** Which occurrences of a repeating event a change or deletion is for. */
export type EventScope = 'THIS' | 'FOLLOWING' | 'ALL';
export type EventTarget = { scope: EventScope; occurrence: string };
export type EventAttendee = Sure<Schemas['EventAttendee'], 'employeeId'>;
export type EventDetail = Sure<Omit<Schemas['CalendarEventDetail'], 'attendees' | 'recurrence' | 'visibility'>, 'id' | 'title' | 'allDay' | 'start' | 'end' | 'organizerId'>
  & { visibility: Visibility; attendees: EventAttendee[]; recurrence?: Recurrence };

/** A place events are held at; an event keeps its place as text, so a place renamed or removed leaves events as they were. */
export type CalendarPlace = { id: string; name: string };
/** A member found by name, to add to an event. */
export type DirectoryPerson = Sure<Schemas['DirectoryItem'], 'id'>;

/** One occurrence among a repeating event's, or the event itself. */
export const eventKey = (event: { id: string; occurrence?: string | null }) => (event.occurrence ? `${event.id}@${event.occurrence}` : event.id);

/** At the start, 5·15·30 minutes, 1·2·12 hours, a day and a week before; null is no reminder. */
export const REMINDERS: readonly { minutes: number | null; label: string }[] = [
  { minutes: null, label: '알림 없음' }, { minutes: 0, label: '시작할 때' }, { minutes: 5, label: '5분 전' }, { minutes: 15, label: '15분 전' },
  { minutes: 30, label: '30분 전' }, { minutes: 60, label: '1시간 전' }, { minutes: 120, label: '2시간 전' }, { minutes: 720, label: '12시간 전' },
  { minutes: 1440, label: '1일 전' }, { minutes: 10080, label: '1주 전' },
];
/**
 * A reminder as it reads for an event: an all-day event has no start time, so its reminder counts from the start of
 * work that day (the server's rule), and says so: 근무 시작 15분 전, 근무 시작할 때.
 */
export const reminderLabel = (minutes: number | null | undefined, allDay: boolean) => {
  const label = REMINDERS.find(item => item.minutes === (minutes ?? null))?.label ?? '알림 없음';
  if (!allDay || minutes == null) return label;
  return minutes === 0 ? '근무 시작할 때' : `근무 시작 ${label}`;
};
export const DEFAULT_REMINDER = 15;
export const EVENT_TITLE_MAX = 200;
export const EVENT_BODY_MAX = 20000;

export const calendarKeys = { all: ['calendar'] as const };

/** What the calendar shows between two days: events, approved leave (and one's own in review), approved overtime and holidays. */
export const calendarFeedOptions = (from: string, to: string) => queryOptions({
  queryKey: [...calendarKeys.all, 'range', from, to],
  queryFn: async ({ signal }): Promise<CalendarFeed> => {
    const feed = await getJson<Partial<CalendarFeed>>(`/api/v1/office/calendar/items?${new URLSearchParams({ from, to })}`, signal);
    return { holidays: feed.holidays ?? [], leaves: feed.leaves ?? [], overtimes: feed.overtimes ?? [], events: feed.events ?? [], failedSources: feed.failedSources ?? [] };
  },
  placeholderData: keepPreviousData,
});

/** An event as one occurrence: the given one, or the first. */
export const calendarEventOptions = (id: string, occurrence?: string) => queryOptions({
  queryKey: [...calendarKeys.all, 'event', id, occurrence ?? ''],
  queryFn: async ({ signal }) => {
    const event = await getJson<EventDetail>(`/api/v1/office/calendar/events/${id}${occurrence ? `?${new URLSearchParams({ occurrence })}` : ''}`, signal);
    return { ...event, attendees: event.attendees ?? [] };
  },
});

/** Resolve only files belonging to this visible event; signed URLs last five minutes. */
export const calendarFileLinkOptions = (id: string) => (fileId: string, download = false) => queryOptions({
  queryKey: [...calendarKeys.all, 'file', id, fileId, download ? 'download' : 'view'],
  queryFn: ({ signal }) => getJson<{ url: string }>(`/api/v1/office/calendar/events/${id}/photos/${fileId}${download ? '?download=true' : ''}`, signal),
  staleTime: 4 * 60 * 1000,
  gcTime: 4 * 60 * 1000,
});

/** One leave as the calendar shows it: approved leave, or the member's own still in review, and who approved it. */
export const calendarLeaveOptions = (id: string) => queryOptions({
  queryKey: [...calendarKeys.all, 'leave', id],
  queryFn: ({ signal }) => getJson<CalendarLeaveDetail>(`/api/v1/office/calendar/leaves/${id}`, signal),
});

/** One approved overtime record as the calendar shows it, each of its days, and who approved it. */
export const calendarOvertimeOptions = (id: string) => queryOptions({
  queryKey: [...calendarKeys.all, 'overtime', id],
  queryFn: ({ signal }) => getJson<CalendarOvertimeRecord>(`/api/v1/office/calendar/overtime/${id}`, signal),
});

/** The places in the order members put them in. */
export const placesOptions = () => queryOptions({
  queryKey: [...calendarKeys.all, 'places'],
  queryFn: ({ signal }) => getJson<CalendarPlace[]>('/api/v1/office/calendar/places', signal),
  staleTime: 60_000,
});

/** Members whose name holds the words, to add to an event. */
export const searchPeople = (words: string, signal?: AbortSignal) =>
  getJson<DirectoryPerson[]>(`/api/v1/directory/employees?${new URLSearchParams({ q: words.trim() })}`, signal);

/** A change of one's own: every calendar read is marked stale and the ones on screen read again. */
export const hearCalendar = (client: QueryClient) => client.invalidateQueries({ queryKey: calendarKeys.all });

/**
 * version is the event's as it was read when changing one: a change someone made in between refuses the save.
 * reminderMinutes is the saver's own reminder, null for none.
 */
export type EventInput = {
  visibility: Visibility; title: string; body: string; location: string; allDay: boolean; start: string; end: string;
  projectId: string | null; recurrence: Recurrence | null; attendees: { employeeId: string; required: boolean }[];
  reminderMinutes?: number | null; photoUploads: string[]; removedPhotoIds: string[]; version?: string; copyFrom?: string;
};

const targeted = (path: string, target?: EventTarget) => (target ? `${path}?${new URLSearchParams(target)}` : path);

const body = (input: EventInput): Schemas['SaveEvent'] => ({
  ...input,
  title: input.title.trim(),
  body: input.body.trim() || undefined,
  location: input.location.trim() || undefined,
  projectId: input.projectId ?? undefined,
  recurrence: input.recurrence ?? undefined,
  attendees: input.visibility === 'PERSONAL' ? [] : input.attendees,
});

/**
 * Adds an event, or changes the given one (for a repeating one, the occurrences the target names); answers its id.
 * Every calendar read refreshes afterwards.
 */
export function useSaveEvent(id: string | undefined) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ input, target }: { input: EventInput; target?: EventTarget }) => {
      if (id) {
        await sendCommand(targeted(`/api/v1/office/calendar/events/${id}`, target), 'PUT', body(input));
        return id;
      }
      const path = await sendCreate('/api/v1/office/calendar/events', body(input));
      return path.split('/').pop() ?? '';
    },
    onSettled: () => hearCalendar(client),
  });
}

/**
 * After an event is deleted every calendar read is stale, but only the others read again: the deleted event's own
 * detail would only answer that it is gone, under the page that is leaving it.
 */
async function hearDeletion(client: QueryClient, id: string) {
  const own = [...calendarKeys.all, 'event', id];
  await client.invalidateQueries({ queryKey: own, refetchType: 'none' });
  await client.invalidateQueries({ queryKey: calendarKeys.all, predicate: query => !own.every((part, index) => query.queryKey[index] === part) });
}

export function useDeleteEvent() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, target }: { id: string; target?: EventTarget }) => sendCommand(targeted(`/api/v1/office/calendar/events/${id}`, target), 'DELETE'),
    onSettled: (_done, error, { id }) => (error ? hearCalendar(client) : hearDeletion(client, id)),
  });
}

/** The signed-in attendee's own reminder for an event. */
export function useEventReminder(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (minutes: number | null) => sendCommand(`/api/v1/office/calendar/events/${id}/reminder`, 'PUT', { minutes }),
    onSettled: () => client.invalidateQueries({ queryKey: [...calendarKeys.all, 'event', id] }),
  });
}
