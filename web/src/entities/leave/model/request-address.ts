/** What a new request asks for, as its page's address names it (/leaves/new?kind=…). */
export type RequestKind = 'annual' | 'special' | 'overtime';

const UUID = /^[0-9a-f-]{36}$/i;
const DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/** A new request's address: what it asks for (none for the choice), a special leave's type, its first day, and the request it asks again. */
export type NewRequestSearch = { kind?: RequestKind; type?: string; date?: string; from?: string };

export function parseNewRequestSearch(raw: Record<string, unknown>): NewRequestSearch {
  const search: NewRequestSearch = {};
  if (raw.kind === 'annual' || raw.kind === 'special' || raw.kind === 'overtime') search.kind = raw.kind;
  if (typeof raw.type === 'string' && UUID.test(raw.type)) search.type = raw.type;
  if (typeof raw.date === 'string' && DATE.test(raw.date)) search.date = raw.date;
  if (typeof raw.from === 'string' && UUID.test(raw.from)) search.from = raw.from;
  return search;
}

/** A request's own page, wherever it is opened from (결재함, 받은 알림, a link passed on). */
export const requestHref = (id: string) => `/requests/${id}`;

/** The address of a new request: the choice, or a kind's form opened at a type or day, or filled from an earlier request. */
export function newRequestHref(search: NewRequestSearch = {}): string {
  const query = new URLSearchParams(Object.entries(search).filter((entry): entry is [string, string] => !!entry[1]));
  const text = query.toString();
  return text ? `/office/leaves/new?${text}` : '/office/leaves/new';
}
