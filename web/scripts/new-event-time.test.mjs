import test from 'node:test';
import assert from 'node:assert/strict';
import { newEventTime } from '../src/pages/office/schedule/model/new-event-time.ts';
import { newEventSearch } from '../src/pages/office/schedule/model/search.ts';

test('calendar links keep past, current and future dates with the appropriate default time', () => {
  for (const [day, start, end] of [['2026-11-02', '10:00', '11:00'], ['2026-11-07', '15:00', '16:00'], ['2026-12-01', '10:00', '11:00']]) {
    assert.deepEqual(newEventTime(newEventSearch(`?date=${day}`), '2026-11-07', 14 * 60 + 20),
      { day, endDay: day, allDay: false, start, end });
  }
});

test('a selected range survives the route even on a past day', () => {
  assert.deepEqual(newEventTime(newEventSearch('?date=2026-11-02&start=09:30&end=12:15'), '2026-11-07', 14 * 60),
    { day: '2026-11-02', endDay: '2026-11-02', allDay: false, start: '09:30', end: '12:15' });
});

test('an unselected date defaults to today without crossing midnight', () => {
  assert.deepEqual(newEventTime(newEventSearch(''), '2026-11-07', 23 * 60 + 50),
    { day: '2026-11-07', endDay: '2026-11-07', allDay: false, start: '23:00', end: '23:59' });
});
