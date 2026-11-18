import type { QueryClient } from '@tanstack/react-query';
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import type { JSONNode } from '@/shared/lib/rich-document';
import { getJson, sendCommand, sendCreate, type components } from '@/shared/api';
import { serverBodyStore, type RichBodyStore } from '@/shared/ui/rich-body';
import { documentKeys, documentPath, type DocumentRow } from './documents';

/*
 * 문서함's own reads and writes beside the documents' and folders' (docs/pending-records.md, 문서함): every project's
 * folder at the top, a document's or folder's mark, a 매뉴얼's chapters and their bodies, and the permissions of a folder
 * or document. Every read sits under ['documents'], so a change made here reads them all again.
 */

type Schemas = components['schemas'];
type Required<T, K extends keyof T> = T & { [P in K]-?: NonNullable<T[P]> };

/** A project's folder at 문서함's top: there for every project, with the project's mark and its latest writing. */
export type BoxProjectFolder = Required<Schemas['DocumentBoxProject'], 'projectId' | 'key' | 'name' | 'archived' | 'itemCount'>;
/** A chapter of a 매뉴얼: under another chapter (none, the first level), placed among its siblings. */
export type ManualChapter = Required<Schemas['ManualChapterRow'], 'id' | 'position' | 'title' | 'updatedAt' | 'version'>;
/** What a document is: a page on its own, or a 매뉴얼 of ordered chapters. */
export type DocumentKind = 'PAGE' | 'MANUAL';
/** How far one may go with a folder or document. */
export type AccessLevel = 'NONE' | 'READ' | 'WRITE' | 'MANAGE';
/** Who a grant is for: the item's maker, a member, a department (with those under it) or a project's members. */
export type GrantSubject = 'OWNER' | 'USER' | 'DEPARTMENT' | 'PROJECT';
export type Grant = { subject: GrantSubject; subjectId?: string; name?: string; level: Exclude<AccessLevel, 'NONE'> };
/** A folder's or document's permissions: its own grants, the closed folders above it, the reader's level and say. */
export type Access = {
  grants: Grant[]; inherited: { folderId: string; folderName: string; grants: Grant[] }[]; level: AccessLevel; canManage: boolean;
};
export type Mark = { icon: string | null; color: string | null };
/** A system folder's kind: 회의록 (narrowed by project) or 주간보고 (by department), kept by their own pages. */
export type SystemKind = 'MEETING' | 'WEEKLY_REPORT';
/** A system folder's row: how many documents the reader sees in it and its latest change. */
export type SystemFolderRow = Required<Schemas['DocumentBoxSystem'], 'kind' | 'count'>;
/** One of a system folder's documents: its title, facet (a project, a department), writer and latest change. */
export type SystemItem = Required<Schemas['DocumentBoxSystemItem'], 'id' | 'title' | 'updatedAt'>;
export type SystemFacet = Required<Schemas['DocumentBoxSystemFacet'], 'id' | 'name' | 'count'>;
export type SystemSlice = { items: SystemItem[]; facets: SystemFacet[]; nextOffset?: number | null };

const CHAPTERS = '/api/v1/workspace/manual-chapters';
const idOf = (location: string) => location.split('/').pop() ?? '';

export const boxKeys = {
  projects: ['documents', 'box', 'projects'] as const,
  chapters: (documentId: string) => ['documents', 'chapters', documentId] as const,
  access: (target: 'documents' | 'document-folders', id: string) => ['documents', 'access', target, id] as const,
  systems: (projectId?: string) => ['documents', 'systems', projectId ?? '-'] as const,
  systemItems: (kind: SystemKind, projectId?: string, facet?: string) => ['documents', 'systems', kind, projectId ?? '-', facet ?? '-'] as const,
};

/** The system folders at 문서함's top, or a project's (its 회의록), with what the reader sees in each. */
export const systemFoldersOptions = (projectId?: string) => queryOptions({
  queryKey: boxKeys.systems(projectId),
  queryFn: ({ signal }) => getJson<SystemFolderRow[]>(`/api/v1/workspace/document-box/systems${projectId ? `?projectId=${projectId}` : ''}`, signal),
});

/** A system folder's documents, the latest changed first (one page of 100), for a project and a facet when given. */
export const systemItemsOptions = (kind: SystemKind, { projectId, facet }: { projectId?: string; facet?: string } = {}) => queryOptions({
  queryKey: boxKeys.systemItems(kind, projectId, facet),
  queryFn: async ({ signal }) => {
    const params = new URLSearchParams({ size: '100' });
    if (projectId) params.set('projectId', projectId);
    if (facet) params.set('facet', facet);
    const items: SystemItem[] = [];
    const offsets = new Set<number>();
    let facets: SystemFacet[];
    for (;;) {
      const page = await getJson<SystemSlice>(`/api/v1/workspace/document-box/systems/${kind}?${params}`, signal);
      items.push(...page.items);
      facets = page.facets;
      if (page.nextOffset == null) break;
      if (offsets.has(page.nextOffset)) throw new Error('문서 목록을 이어 읽지 못했습니다.');
      offsets.add(page.nextOffset);
      params.set('offset', String(page.nextOffset));
    }
    return { items, facets } satisfies SystemSlice;
  },
});

/** Every project's folder at 문서함's top, in the administrators' order. */
export const boxProjectsOptions = () => queryOptions({
  queryKey: boxKeys.projects,
  queryFn: ({ signal }) => getJson<BoxProjectFolder[]>('/api/v1/workspace/document-box/projects', signal),
});

/** A 매뉴얼's chapters by place; the tree is built from parents. */
export const chaptersOptions = (documentId: string) => queryOptions({
  queryKey: boxKeys.chapters(documentId),
  queryFn: ({ signal }) => getJson<ManualChapter[]>(`${documentPath(documentId)}/chapters`, signal),
});

/** A folder's or document's permissions. */
export const accessOptions = (target: 'documents' | 'document-folders', id: string) => queryOptions({
  queryKey: boxKeys.access(target, id),
  queryFn: ({ signal }) => getJson<Access>(`/api/v1/workspace/${target}/${encodeURIComponent(id)}/access`, signal),
});

function useBoxCommand<T, R>(send: (input: T) => Promise<R>, onDone?: (result: R) => void) {
  const client = useQueryClient();
  return useMutation({ mutationFn: send, onSuccess: result => onDone?.(result), onSettled: () => client.invalidateQueries({ queryKey: documentKeys.all }) });
}

/** A new document of a kind, marked, with its first body (a 매뉴얼's cover); its id comes back. */
export type NewBoxDocument = { projectKey: string; parentId?: string; kind: 'PAGE'; title: string; mark: Mark; body?: JSONNode; uploadIds?: string[]; labelIds?: string[] };
export const useCreateBoxDocument = (onDone?: (id: string) => void) => useBoxCommand(async (input: NewBoxDocument) => idOf(await sendCreate('/api/v1/workspace/documents', {
  projectKey: input.projectKey, parentId: input.parentId, kind: input.kind, title: input.title.trim(),
  icon: input.mark.icon ?? undefined, color: input.mark.color ?? undefined, body: input.body, uploadIds: input.uploadIds, labelIds: input.labelIds,
})), onDone);

/** A document's own icon and colour. */
export const useMark = (onDone?: () => void) => useBoxCommand((change: { document: DocumentRow; mark: Mark }) =>
  sendCommand(`${documentPath(change.document.id)}/mark`, 'PUT', { expectedVersion: change.document.version, ...markBody(change.mark) }), onDone);
const markBody = (mark: Mark) => ({ icon: mark.icon ?? undefined, color: mark.color ?? undefined });

/** A chapter made (last under its parent), renamed, moved (under a parent, at an index) or deleted with those under it. */
export type ChapterChange =
  | { kind: 'create'; documentId: string; parentId?: string; title: string }
  | { kind: 'rename'; chapter: ManualChapter; title: string }
  | { kind: 'move'; chapter: ManualChapter; parentId?: string; index: number }
  | { kind: 'delete'; chapter: ManualChapter };
export const useChangeChapter = (onDone?: (id?: string) => void) => useBoxCommand(async (change: ChapterChange): Promise<string | undefined> => {
  const at = (chapter: ManualChapter) => `${CHAPTERS}/${encodeURIComponent(chapter.id)}`;
  switch (change.kind) {
    case 'create': return idOf(await sendCreate(`${documentPath(change.documentId)}/chapters`, { parentId: change.parentId, title: change.title.trim() }));
    case 'rename': await sendCommand(at(change.chapter), 'PATCH', { expectedVersion: change.chapter.version, title: change.title.trim() }); return undefined;
    case 'move': await sendCommand(`${at(change.chapter)}/move`, 'POST', { expectedVersion: change.chapter.version, parentId: change.parentId, index: change.index }); return undefined;
    case 'delete': await sendCommand(`${at(change.chapter)}?expectedVersion=${change.chapter.version}`, 'DELETE'); return undefined;
  }
}, onDone);

/** A folder's or document's grants in place of what it had; none opens it. */
export const useReplaceAccess = (onDone?: () => void) => useBoxCommand(({ target, id, grants }: { target: 'documents' | 'document-folders'; id: string; grants: Grant[] }) =>
  sendCommand(`/api/v1/workspace/${target}/${encodeURIComponent(id)}/access`, 'PUT', {
    grants: grants.map(grant => ({ subject: grant.subject, subjectId: grant.subjectId, level: grant.level })),
  }), onDone);

/** A chapter's body for RichBody, as a document's: read and saved there, with its kept versions. */
export function chapterBodyStore({ id, author, canWrite, client, readerId }: { id: string; author: string; canWrite: boolean; client?: QueryClient; readerId?: string }): RichBodyStore {
  return serverBodyStore({ base: `${CHAPTERS}/${encodeURIComponent(id)}/body`, author, canWrite, client, readerId });
}

/** What a document's or a chapter's timeline is under: the document's address or the chapter's. */
export type BodyTarget = 'documents' | 'manual-chapters';
/** One entry of a document's or chapter's 활동: a comment (its text and the words it quotes) or a change (BODY). */
export type BodyActivityEntry = Required<Schemas['BodyActivityEntry'], 'kind' | 'id' | 'at'>;

/** A document's or a chapter's 활동, oldest first. */
export const bodyActivityOptions = (target: BodyTarget, id: string) => queryOptions({
  queryKey: ['documents', 'activity', target, id] as const,
  queryFn: ({ signal }) => getJson<BodyActivityEntry[]>(`/api/v1/workspace/${target}/${encodeURIComponent(id)}/timeline`, signal),
});

/** A comment written (quoting words of the body it was written on), changed or deleted on a document's or chapter's 활동. */
export function changeBodyComment(target: BodyTarget, id: string, change: { commentId?: string; text?: string; quote?: string; parentId?: string; blockId?: string; isDeleting?: boolean }): Promise<void> {
  const base = `/api/v1/workspace/${target}/${encodeURIComponent(id)}/comments`;
  if (change.isDeleting && change.commentId) return sendCommand(`${base}/${change.commentId}`, 'DELETE');
  if (change.commentId) return sendCommand(`${base}/${change.commentId}`, 'PATCH', { body: change.text });
  return sendCreate(base, { body: change.text, quote: change.quote, parentId: change.parentId, blockId: change.blockId }).then(() => undefined);
}

/** A thread on a document's or chapter's 활동 resolved, or opened again. */
export function resolveBodyComment(target: BodyTarget, id: string, commentId: string, resolved: boolean): Promise<void> {
  return sendCommand(`/api/v1/workspace/${target}/${encodeURIComponent(id)}/comments/${commentId}/resolution`, 'PUT', { resolved });
}
