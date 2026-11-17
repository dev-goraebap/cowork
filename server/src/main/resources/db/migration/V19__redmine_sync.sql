-- How far each Redmine project has been brought into Projects: the moment the last pull started. The next pull asks
-- Redmine only for the work items changed since (a minute earlier, for clocks a little apart).
CREATE TABLE pj_redmine_sync (
    redmine_identifier varchar(100) NOT NULL,
    synced_at timestamptz NOT NULL,
    CONSTRAINT pj_redmine_sync_pkey PRIMARY KEY (redmine_identifier)
);
