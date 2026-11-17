-- A meeting's project tag is optional: minutes may be kept with no tag. SQLite cannot drop NOT NULL from a column, so
-- the table is made again with tag_id nullable, its rows copied over, and the indexes put back.
CREATE TABLE meeting_next (
    meeting_id uuid NOT NULL,
    tag_id uuid,
    title text NOT NULL,
    audio_file_name text,
    status text NOT NULL,
    error_message text,
    raw_transcript jsonb,
    structured_minutes text,
    extra_note text,
    referenced_meeting_ids jsonb DEFAULT '[]' NOT NULL,
    deleted_at timestamptz,
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    updated_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    created_by uuid,
    updated_by uuid,
    transcribed_at timestamptz,
    revision_of_meeting_id uuid,
    event_id uuid,
    event_occurrence timestamp,
    CONSTRAINT meeting_next_pkey PRIMARY KEY (meeting_id)
-- [jooq ignore start]
    , CONSTRAINT meeting_revision_of_meeting_id_fkey FOREIGN KEY (revision_of_meeting_id) REFERENCES meeting_next(meeting_id)
    , CONSTRAINT meeting_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES project_tag(tag_id)
-- [jooq ignore stop]
);

-- [jooq ignore start]
INSERT INTO meeting_next (
    meeting_id, tag_id, title, audio_file_name, status, error_message, raw_transcript, structured_minutes, extra_note,
    referenced_meeting_ids, deleted_at, created_at, updated_at, created_by, updated_by, transcribed_at,
    revision_of_meeting_id, event_id, event_occurrence)
SELECT
    meeting_id, tag_id, title, audio_file_name, status, error_message, raw_transcript, structured_minutes, extra_note,
    referenced_meeting_ids, deleted_at, created_at, updated_at, created_by, updated_by, transcribed_at,
    revision_of_meeting_id, event_id, event_occurrence
FROM meeting;
-- [jooq ignore stop]

DROP TABLE meeting;

ALTER TABLE meeting_next RENAME TO meeting;

-- The code generator's simulation cannot index text columns; the indexes are the database's alone, as in V1.
-- [jooq ignore start]
CREATE INDEX ix_meeting_created ON meeting (created_at, meeting_id);

CREATE INDEX meeting_revision_of_meeting_id_idx ON meeting (revision_of_meeting_id);

CREATE INDEX meeting_status_created_at_idx ON meeting (status, created_at);

CREATE INDEX meeting_tag_id_idx ON meeting (tag_id);

CREATE UNIQUE INDEX ux_meeting_event ON meeting (event_id, event_occurrence) WHERE ((event_id IS NOT NULL) AND (deleted_at IS NULL));
-- [jooq ignore stop]
