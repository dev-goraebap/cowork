ALTER TABLE meeting ADD COLUMN private_note boolean NOT NULL DEFAULT false;
ALTER TABLE meeting ADD COLUMN published_meeting_id uuid;
CREATE INDEX ix_private_notes_owner ON meeting (private_note, created_by, created_at, meeting_id);
