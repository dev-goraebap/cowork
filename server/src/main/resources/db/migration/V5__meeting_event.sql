-- The calendar event a meeting's minutes are for: event_id with event_occurrence, the occurrence's original start by
-- the event's rule (the event's start when it does not repeat). Both are empty for minutes kept apart from any event.
-- An occurrence has at most one meeting's minutes; deleted meetings let go of theirs.
ALTER TABLE meeting ADD COLUMN event_id uuid;

ALTER TABLE meeting ADD COLUMN event_occurrence timestamp;

CREATE UNIQUE INDEX ux_meeting_event ON meeting (event_id, event_occurrence) WHERE ((event_id IS NOT NULL) AND (deleted_at IS NULL));
