-- When a meeting was held, on the company's wall clock (Asia/Seoul) as events keep it: held_start to held_end, the
-- whole day when held_all_day. Minutes tied to an event occurrence take its time. Meetings made before had no time of
-- their own and stood for when the recording came in; that is their start, with no end.
ALTER TABLE meeting ADD COLUMN held_start timestamp;

ALTER TABLE meeting ADD COLUMN held_end timestamp;

ALTER TABLE meeting ADD COLUMN held_all_day boolean DEFAULT false NOT NULL;

-- [jooq ignore start]
UPDATE meeting SET held_start = strftime('%Y-%m-%d %H:%M:%S', created_at, '+9 hours');

CREATE INDEX ix_meeting_held ON meeting (held_start, meeting_id);
-- [jooq ignore stop]
