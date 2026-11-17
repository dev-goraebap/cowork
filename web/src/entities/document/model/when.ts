const zone = { timeZone: 'Asia/Seoul' } as const;
const time = new Intl.DateTimeFormat('ko-KR', { ...zone, hour: 'numeric', minute: '2-digit' });
const thisYear = new Intl.DateTimeFormat('ko-KR', { ...zone, month: 'long', day: 'numeric' });
const pastYear = new Intl.DateTimeFormat('ko-KR', { ...zone, year: 'numeric', month: 'numeric', day: 'numeric' });
const moment = new Intl.DateTimeFormat('ko-KR', { ...zone, year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const day = new Intl.DateTimeFormat('en-CA', { ...zone, year: 'numeric', month: '2-digit', day: '2-digit' });

/** When a row was last written, short: the time today, the month and day this year, the whole date before. */
export function changedText(value: string, now = new Date()): string {
  const date = new Date(value);
  if (day.format(date) === day.format(now)) return time.format(date);
  return (day.format(date).slice(0, 4) === day.format(now).slice(0, 4) ? thisYear : pastYear).format(date);
}

/** A moment in full, for a document's own page. */
export const momentText = (value: string) => moment.format(new Date(value));
