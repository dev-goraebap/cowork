import { infiniteQueryOptions, keepPreviousData, queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { getJson, sendCommand, sendCreate, type components } from '@/shared/api';

type Schemas = components['schemas'];
type Required<T, K extends keyof T> = T & { [P in K]-?: NonNullable<T[P]> };

export type AnnouncementItem = Required<Schemas['AnnouncementItem'], 'id' | 'status' | 'attachmentCount' | 'read' | 'readCount' | 'pinned'>;
export type AnnouncementSlice = { items: AnnouncementItem[]; nextCursor?: string };
export type AnnouncementAuthor = { id: string; name: string };
export type AnnouncementFile = {
  id: string; filename: string; contentType?: string; size: number; image: boolean; dominantColor?: string; width?: number; height?: number;
};
export type AnnouncementDetail = Required<Omit<Schemas['AnnouncementDetail'], 'attachments'>,
  'id' | 'status' | 'editable' | 'readCount' | 'readersVisible' | 'pinned' | 'popup'> & { attachments: AnnouncementFile[] };
/** A member who read a notice, for its writer and administrators. */
export type AnnouncementReader = { employeeId: string; name?: string | null; departmentName?: string | null; readAt: string };
/** Pinned over the list, shown as a popup, or both, from one day to another (ISO dates, both included). */
export type AnnouncementFeature = { pinned: boolean; popup: boolean; from?: string; until?: string };

/**
 * What the list reads, as client/'s: words in the title, read state, a period, writers (ids joined by commas), whether
 * files are attached, and the order (by when it was published unless by title; newest first unless asc).
 */
export type AnnouncementListing = {
  q?: string; read?: 'unread' | 'read'; period?: 'week' | 'month' | 'year'; author?: string; attached?: 'yes' | 'no';
  sort?: 'title'; direction?: 'asc' | 'desc';
};

export const PAGE_SIZE = 20;
export const announcementKeys = { all: ['announcements'] as const };

/** The listing as the API reads it: its enum values upper case, the writers as authorId, attached as a boolean. */
function listingParams(listing: AnnouncementListing, cursor?: string): URLSearchParams {
  const params = new URLSearchParams({ size: String(PAGE_SIZE) });
  if (listing.q) params.set('q', listing.q);
  if (listing.read) params.set('read', listing.read.toUpperCase());
  if (listing.period) params.set('period', listing.period.toUpperCase());
  if (listing.author) params.set('authorId', listing.author);
  if (listing.attached) params.set('attached', String(listing.attached === 'yes'));
  if (listing.sort) params.set('sort', listing.sort.toUpperCase());
  if (listing.direction) params.set('direction', listing.direction.toUpperCase());
  if (cursor) params.set('cursor', cursor);
  return params;
}

/** Published notices matching the listing, read one slice after another. */
export const announcementsOptions = (listing: AnnouncementListing) => infiniteQueryOptions({
  queryKey: [...announcementKeys.all, 'published', listing],
  queryFn: ({ pageParam, signal }) => getJson<AnnouncementSlice>(`/api/v1/office/announcements?${listingParams(listing, pageParam)}`, signal),
  initialPageParam: undefined as string | undefined,
  getNextPageParam: last => last.nextCursor ?? undefined,
  placeholderData: keepPreviousData,
});

/** Who wrote the published notices, for the writer filter. */
export const authorsOptions = () => queryOptions({
  queryKey: [...announcementKeys.all, 'authors'],
  queryFn: ({ signal }) => getJson<AnnouncementAuthor[]>('/api/v1/office/announcements/authors', signal),
  staleTime: 60_000,
});

/** The notices pinned over the list today, shown above it whatever it is narrowed to. */
export const pinnedOptions = () => queryOptions({
  queryKey: [...announcementKeys.all, 'pinned'],
  queryFn: ({ signal }) => getJson<AnnouncementItem[]>('/api/v1/office/announcements/pinned', signal),
});

/** Who read the notice, earliest first, for its writer and administrators. */
export const readersOptions = (id: string) => queryOptions({
  queryKey: [...announcementKeys.all, 'readers', id],
  queryFn: ({ signal }) => getJson<AnnouncementReader[]>(`/api/v1/office/announcements/${id}/readers`, signal),
});

export const announcementOptions = (id: string) => queryOptions({
  queryKey: [...announcementKeys.all, 'detail', id],
  queryFn: ({ signal }) => getJson<AnnouncementDetail>(`/api/v1/office/announcements/${id}`, signal),
});

/** Links last five minutes on the server; refetching after four keeps a shown picture's address valid. */
const LINK_FRESH_MS = 4 * 60 * 1000;
/** A notice's file's address, to show (a picture) or to download. */
export const fileLinkOptions = (id: string) => (fileId: string, download = false) => queryOptions({
  queryKey: [...announcementKeys.all, 'file', id, fileId, download ? 'download' : 'view'],
  queryFn: ({ signal }) => getJson<{ url: string }>(`/api/v1/office/announcements/${id}/attachments/${fileId}${download ? '?download=true' : ''}`, signal),
  staleTime: LINK_FRESH_MS,
  gcTime: LINK_FRESH_MS,
});

/**
 * Reading a published notice: every notice read is marked stale and read again where shown (its unread mark goes), and so
 * are the notice's own detail and readers, so its read count and the readers popover agree from the first opening.
 */
export function useMarkRead() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sendCommand(`/api/v1/office/announcements/${id}/reads`, 'POST'),
    onSuccess: (_, id) => Promise.all([
      client.invalidateQueries({ queryKey: [...announcementKeys.all, 'published'] }),
      client.invalidateQueries({ queryKey: announcementOptions(id).queryKey }),
      client.invalidateQueries({ queryKey: readersOptions(id).queryKey }),
    ]),
  });
}

/**
 * What the compose form saves: the files to add (upload ids) and to take off. feature is sent only by an administrator's
 * form; leaving it out keeps how the notice is featured.
 */
export type ComposeInput = { title: string; content: string; add: string[]; remove: string[]; feature?: AnnouncementFeature };

/** Publishes a new notice (no drafts), or saves the change to one; onDone receives the notice's id to show it. */
export function useSaveAnnouncement(id: string | undefined, onDone: (id: string) => void) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: ComposeInput) => {
      if (id) {
        await sendCommand(`/api/v1/office/announcements/${id}`, 'PUT', {
          title: input.title, content: input.content, addAttachments: input.add, removeAttachments: input.remove, feature: input.feature,
        });
        return id;
      }
      const path = await sendCreate('/api/v1/office/announcements', { title: input.title, content: input.content, attachments: input.add, feature: input.feature });
      const created = path.split('/').pop();
      if (!created) throw new Error('저장한 공지를 찾지 못했습니다.');
      return created;
    },
    onSuccess: onDone,
    onSettled: () => client.invalidateQueries({ queryKey: announcementKeys.all }),
  });
}

/**
 * Deletes a notice; the reads are only marked stale, read where they are next shown, so the deleted notice's own page
 * is not read again (it would answer 404) as it closes.
 */
export function useDeleteAnnouncement(onDone: () => void) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sendCommand(`/api/v1/office/announcements/${id}`, 'DELETE'),
    onSuccess: onDone,
    onSettled: () => client.invalidateQueries({ queryKey: announcementKeys.all, refetchType: 'none' }),
  });
}
