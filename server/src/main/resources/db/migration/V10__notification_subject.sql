-- What a notice is about and when it is done with, so the member need not clear it by hand once its purpose is met.
-- subject_type and subject_id name the one thing it is about (a notice, a request, an event); ends says whether seeing
-- that thing is enough (SEEN) or only doing what it asks is (DONE); expires_at, when set, is when it no longer matters.
ALTER TABLE notification_event ADD COLUMN subject_type varchar(32);

ALTER TABLE notification_event ADD COLUMN subject_id uuid;

ALTER TABLE notification_event ADD COLUMN ends varchar(8) DEFAULT 'SEEN' NOT NULL;

ALTER TABLE notification_event ADD COLUMN expires_at timestamptz;

CREATE INDEX ix_notification_event_subject ON notification_event (subject_type, subject_id);

CREATE INDEX ix_notification_event_expires ON notification_event (expires_at);

-- Notices left before this read what they are about from their link. Older approval notices that opened the box
-- rather than one request (/approvals, /approvals?tab=...) are about nothing in particular and keep no subject.
-- [jooq ignore start]
UPDATE notification_event
SET subject_type = 'ANNOUNCEMENT', subject_id = substr(link, 16, 36)
WHERE kind LIKE 'ANNOUNCEMENT%' AND link LIKE '/announcements/%' AND length(link) >= 51;

UPDATE notification_event
SET subject_type = 'APPROVAL_REQUEST', subject_id = substr(link, 12, 36)
WHERE link LIKE '/approvals/%' AND length(link) >= 47;

UPDATE notification_event
SET subject_type = 'CALENDAR_EVENT', subject_id = substr(link, instr(link, 'event=') + 6, 36)
WHERE kind LIKE 'EVENT%' AND instr(link, 'event=') > 0;

-- An approver's turn is done with only once they decide.
UPDATE notification_event SET ends = 'DONE' WHERE substr(kind, -10) = '_SUBMITTED';
-- [jooq ignore stop]
