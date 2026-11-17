DROP INDEX IF EXISTS ux_meeting_event;
CREATE INDEX ix_meeting_event ON meeting (event_id, event_occurrence);
