import { infiniteQueryOptions, keepPreviousData, queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { getJson, sendCommand, sendCreate, sendJson, type components } from '@/shared/api';

type Schemas = components['schemas'];
type Required<T, K extends keyof T> = T & { [P in K]-?: NonNullable<T[P]> };

export type MeetingItem = Required<Schemas['MeetingItem'], 'id' | 'title' | 'status' | 'createdAt'>;
export type MeetingSlice = { items: MeetingItem[]; nextCursor?: string };
export type FoundMeeting = { meeting: MeetingItem; excerpt?: string };
export type FoundMeetingSlice = { items: FoundMeeting[]; nextCursor?: string };
export type TranscriptSegment = Required<Schemas['TranscriptSegment'], 'startMs' | 'endMs' | 'text'>;
export type MeetingPhoto = { id: string; filename: string; contentType?: string; size: number; image: boolean };
/** The event occurrence minutes are for; found is false, with only the id, when it is gone or hidden from the viewer. */
export type MeetingEvent = Required<Schemas['MeetingEvent'], 'eventId' | 'found' | 'allDay'>;
/** The time a meeting shows: its event occurrence's while tied to one (fromEvent), else its own. */
export type MeetingHeldView = Required<Schemas['MeetingHeld'], 'start' | 'allDay' | 'fromEvent'>;
export type MeetingDetail = Required<Omit<Schemas['MeetingDetail'], 'transcript' | 'photos' | 'event' | 'held'>, 'id' | 'title' | 'status' | 'editable'>
  & { transcript: TranscriptSegment[]; photos: MeetingPhoto[]; event?: MeetingEvent; held: MeetingHeldView };
/** The list's conditions as the API reads them: projects (ids joined by commas), how far the minutes are, and the way. */
export type MeetingListing = { project?: string; progress?: 'in_progress' | 'completed' | 'failed'; direction?: 'asc' };

export const PAGE_SIZE = 20;
export const PROMPT_MAX = 20000;
export const meetingKeys = { all: ['meetings'] as const };
export type EventAt = { eventId: string; occurrence?: string | null };

export const eventMeetingsOptions = ({ eventId, occurrence }: EventAt) => queryOptions({
  queryKey: [...meetingKeys.all, 'event', eventId, occurrence ?? null],
  queryFn: ({ signal }) => {
    const params = new URLSearchParams({ eventId });
    if (occurrence) params.set('occurrence', occurrence);
    return getJson<{ meetings?: MeetingItem[]; meeting?: MeetingItem }>(`/api/v1/office/meetings/for-event?${params}`, signal);
  },
});

export const meetingCreateHref = (event?: EventAt, projectId?: string) => {
  const params = new URLSearchParams();
  if (event) params.set('event', event.eventId);
  if (event?.occurrence) params.set('occurrence', event.occurrence);
  if (projectId) params.set('project', projectId);
  return `/office/meetings/new${params.size ? `?${params}` : ''}`;
};

export const createMeeting = (request: Schemas['NewMeeting'] & { noteUploads?: string[] }) => sendCreate('/api/v1/office/meetings', request);

export const useLinkMeetingEvent = (id: string) =>
  useMeetingCommand((at: EventAt | null) => sendCommand(`/api/v1/office/meetings/${id}/event`, at ? 'PUT' : 'DELETE', at ?? undefined));

const IN_PROGRESS = new Set(['UPLOADED', 'TRANSCRIBING', 'SUMMARIZING']);
/** Whether the minutes are still being made. */
export const inProgress = (status: string) => IN_PROGRESS.has(status);

/** Meetings matching the listing, newest held first unless asked otherwise, read one slice after another. */
export const meetingsOptions = (listing: MeetingListing) => infiniteQueryOptions({
  queryKey: [...meetingKeys.all, 'list', listing],
  queryFn: ({ pageParam, signal }) => {
    const params = new URLSearchParams({ size: String(PAGE_SIZE) });
    for (const project of listing.project?.split(',') ?? []) params.append('projectId', project);
    if (listing.progress) params.set('progress', listing.progress.toUpperCase());
    if (listing.direction) params.set('direction', listing.direction.toUpperCase());
    if (pageParam) params.set('cursor', pageParam);
    return getJson<MeetingSlice>(`/api/v1/office/meetings?${params}`, signal);
  },
  initialPageParam: undefined as string | undefined,
  getNextPageParam: last => last.nextCursor ?? undefined,
  placeholderData: keepPreviousData,
});

/** Meetings whose title, minutes or note hold the words, newest held first, each with the text that holds them. */
export const meetingSearchOptions = (q: string) => infiniteQueryOptions({
  queryKey: [...meetingKeys.all, 'search', q],
  queryFn: ({ pageParam, signal }) => {
    const params = new URLSearchParams({ q, size: String(PAGE_SIZE) });
    if (pageParam) params.set('cursor', pageParam);
    return getJson<FoundMeetingSlice>(`/api/v1/office/meetings/search?${params}`, signal);
  },
  initialPageParam: undefined as string | undefined,
  getNextPageParam: last => last.nextCursor ?? undefined,
  placeholderData: keepPreviousData,
  staleTime: 30_000,
});

/** One meeting; polled every five seconds while its minutes are being made, so the page moves on without a reload. */
export const meetingOptions = (id: string) => queryOptions({
  queryKey: [...meetingKeys.all, 'detail', id],
  queryFn: ({ signal }) => getJson<MeetingDetail>(`/api/v1/office/meetings/${id}`, signal),
  refetchInterval: query => (query.state.data && inProgress(query.state.data.status) ? 5_000 : false),
});

/** The instructions every summary follows (administrators). */
export const promptOptions = () => queryOptions({
  queryKey: [...meetingKeys.all, 'prompt'],
  queryFn: ({ signal }) => getJson<{ key?: string; content?: string }>('/api/v1/office/meetings/prompt', signal),
});

/** Links last five minutes on the server; refetching after four keeps a shown picture's address valid. */
const LINK_FRESH_MS = 4 * 60 * 1000;
/** A meeting's picture or file's address, to show or to download. */
export const photoLinkOptions = (id: string) => (photoId: string, download = false) => queryOptions({
  queryKey: [...meetingKeys.all, 'photo', id, photoId, download ? 'download' : 'view'],
  queryFn: ({ signal }) => getJson<{ url: string }>(`/api/v1/office/meetings/${id}/photos/${photoId}${download ? '?download=true' : ''}`, signal),
  staleTime: LINK_FRESH_MS,
  gcTime: LINK_FRESH_MS,
});

/** A command on meetings; every meeting read is read again afterwards (refetch says whether at once or when next shown). */
function useMeetingCommand<T, R>(send: (input: T) => Promise<R>, onDone?: (result: R) => void, refetch: 'active' | 'none' = 'active') {
  const client = useQueryClient();
  return useMutation({
    mutationFn: send,
    onSuccess: result => onDone?.(result),
    onSettled: () => client.invalidateQueries({ queryKey: meetingKeys.all, refetchType: refetch }),
  });
}

/** A failed meeting goes back to waiting for the next run. */
export const useRetryMeeting = (id: string) => useMeetingCommand(() => sendCommand(`/api/v1/office/meetings/${id}/retries`, 'POST'));
/** Deleting leaves the reads stale, so the deleted meeting's page is not read again as it closes. */
export const useDeleteMeeting = (id: string, onDone: () => void) =>
  useMeetingCommand(() => sendCommand(`/api/v1/office/meetings/${id}`, 'DELETE'), onDone, 'none');
export const useSavePrompt = (onDone: () => void) =>
  useMeetingCommand((content: string) => sendCommand('/api/v1/office/meetings/prompt', 'PUT', { content }), onDone);
/** Moves the oldest waiting step along now instead of waiting for the next scheduled run. */
export const useRunPipeline = () =>
  useMeetingCommand(() => sendJson<{ transcribed: boolean; summarized: boolean }>('/api/v1/office/meetings/pipeline-runs', 'POST'));
