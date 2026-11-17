-- Weekly reports are written by everyone and seen by the leads above them in the organization chart, so the lists of
-- writers and of those who see every report go, and so do the deadline reminders, set aside for now.
DROP TABLE weekly_report_target;

DROP TABLE weekly_report_viewer;

DROP TABLE weekly_report_reminder;

-- A submitted report stays open to correction, confirmed or not; each correction keeps what the report said before it,
-- who changed it and when, so a reader can see what changed.
CREATE TABLE weekly_report_revision (
    revision_id uuid NOT NULL,
    report_id uuid NOT NULL,
    revised_at timestamptz NOT NULL,
    revised_by uuid NOT NULL,
    this_week text,
    next_week text,
    note text,
    CONSTRAINT weekly_report_revision_pkey PRIMARY KEY (revision_id)
-- [jooq ignore start]
    , CONSTRAINT weekly_report_revision_report_fk FOREIGN KEY (report_id) REFERENCES weekly_report(report_id) ON DELETE CASCADE
-- [jooq ignore stop]
);

CREATE INDEX ix_weekly_report_revision_report ON weekly_report_revision (report_id, revised_at);
