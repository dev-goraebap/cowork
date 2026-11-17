import { inAppLink } from './kinds';

/** What a notice points to, read from its link: a request, an announcement, an event (one occurrence of it), a work item. */
export type NoticeTarget =
  | { kind: 'request'; id: string }
  | { kind: 'announcement'; id: string }
  | { kind: 'event'; id: string; occurrence?: string }
  | { kind: 'work-item'; projectKey: string; number: number };

const UUID = '[0-9a-fA-F-]{36}';
const OCCURRENCE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;
const REF = /^([A-Za-z0-9]{2,10})-(\d+)$/;

/** The address's parts matched against a shape, the id (or key and number) captured. */
const PATHS: { shape: RegExp; read: (match: RegExpExecArray, query: URLSearchParams) => NoticeTarget | undefined }[] = [
  { shape: new RegExp(`^(?:/office)?/approvals/(${UUID})(?:/decide)?$`), read: match => ({ kind: 'request', id: match[1]! }) },
  { shape: new RegExp(`^/requests/(${UUID})$`), read: match => ({ kind: 'request', id: match[1]! }) },
  { shape: new RegExp(`^(?:/office)?/announcements/(${UUID})$`), read: match => ({ kind: 'announcement', id: match[1]! }) },
  {
    shape: new RegExp(`^(?:(?:/office)?/schedule/events|/office/calendar/events)/(${UUID})$`),
    read: (match, query) => event(match[1]!, query),
  },
  {
    // The calendar opened on the event's day with it shown: /calendar?date=…&event={id}[&occurrence=…].
    shape: /^(?:\/office)?\/(?:calendar|schedule)$/,
    read: (_, query) => (new RegExp(`^${UUID}$`).test(query.get('event') ?? '') ? event(query.get('event')!, query) : undefined),
  },
  {
    // 알림에 남은 링크는 옛 주소일 수 있다(공간 접두가 붙기 전): 둘 다 읽는다.
    shape: /^(?:\/workspace)?\/(?:work-items|issues)\/([^/]+)$/,
    read: match => {
      const ref = REF.exec(match[1]!);
      return ref ? { kind: 'work-item', projectKey: ref[1]!.toUpperCase(), number: Number(ref[2]) } : undefined;
    },
  },
  {
    shape: /^(?:\/workspace)?\/projects\/([A-Za-z0-9]{2,10})\/(?:work-items|issues)\/(\d+)$/,
    read: match => ({ kind: 'work-item', projectKey: match[1]!.toUpperCase(), number: Number(match[2]) }),
  },
];

function event(id: string, query: URLSearchParams): NoticeTarget {
  const occurrence = query.get('occurrence') ?? undefined;
  return { kind: 'event', id, occurrence: occurrence && OCCURRENCE.test(occurrence) ? occurrence : undefined };
}

/**
 * What a notice's link points to, so its detail can show that thing in place: approvals' and client/'s request addresses,
 * announcements', events' (their own page or the calendar opened on them), and work items' (by reference, under a
 * project, or the old issues addresses). Nothing for a link elsewhere, or none. Pure: it reads the link alone.
 */
export function targetOf(link?: string): NoticeTarget | undefined {
  const href = inAppLink(link);
  if (!href) return undefined;
  const url = new URL(href, 'http://cowork.invalid');
  const path = url.pathname.replace(/\/+$/, '') || '/';
  for (const { shape, read } of PATHS) {
    const match = shape.exec(path);
    if (match) return read(match, url.searchParams);
  }
  return undefined;
}
