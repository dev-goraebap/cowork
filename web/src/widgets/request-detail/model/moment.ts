const format = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric', weekday: 'short', hour: 'numeric', minute: '2-digit',
});
/** A moment in full: the day, its weekday and the time. */
export const momentText = (value?: string | null) => (value ? format.format(new Date(value)) : '');

const weekday = new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'short', timeZone: 'UTC' });
/** A calendar day with its weekday: 10월 8일 (수). */
export const dayText = (date?: string) => (date ? weekday.format(new Date(`${date}T00:00:00Z`)) : '');

const short = new Intl.DateTimeFormat('ko-KR', { month: 'numeric', day: 'numeric', timeZone: 'UTC' });
/** A calendar day in short: 10. 8. */
export const shortDay = (date: string) => short.format(new Date(`${date}T00:00:00Z`));
