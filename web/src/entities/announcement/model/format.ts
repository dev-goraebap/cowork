const zone = { timeZone: 'Asia/Seoul' } as const;
const momentFormat = new Intl.DateTimeFormat('ko-KR', { ...zone, year: 'numeric', month: 'long', day: 'numeric', weekday: 'short', hour: 'numeric', minute: '2-digit' });
const thisYear = new Intl.DateTimeFormat('ko-KR', { ...zone, month: 'long', day: 'numeric' });
const pastYear = new Intl.DateTimeFormat('ko-KR', { ...zone, year: 'numeric', month: 'numeric', day: 'numeric' });
const yearOf = (date: Date) => new Intl.DateTimeFormat('en', { ...zone, year: 'numeric' }).format(date);

/** A notice's moment in full, for its own page: the day, its weekday and the time. */
export const momentText = (value?: string | null) => (value ? momentFormat.format(new Date(value)) : '');

/** A row's date, short: the month and day this year, the whole date for an earlier year. */
export function listDateText(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  return (yearOf(date) === yearOf(new Date()) ? thisYear : pastYear).format(date);
}

/** How a notice stands out and for which days, such as 고정·팝업 10/1~10/7; null for an ordinary one. */
export function featureText(notice: { pinned: boolean; popup: boolean; featuredFrom?: string | null; featuredUntil?: string | null }): string | null {
  if (!notice.pinned && !notice.popup) return null;
  const kinds = [notice.pinned ? '고정' : null, notice.popup ? '팝업' : null].filter(Boolean).join('·');
  const day = (iso?: string | null) => (iso ? `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))}` : '');
  return `${kinds} ${day(notice.featuredFrom)}~${day(notice.featuredUntil)}`;
}
