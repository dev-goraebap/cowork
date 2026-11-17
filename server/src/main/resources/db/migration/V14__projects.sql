-- the workspace (D-fhbtjwmuvn): projects with their members, work items numbered per project from 1, their journal
-- (status changes and comments) and logged time, releases, sprints, and the wiki's folders and files. Every table starts
-- with pj_ so it is not confused with the office's project_tag (event tags). People point at users(user_id); a wiki
-- file's bytes are the file module's attachment, and so are a work item's description files. Nothing is deleted but
-- wiki files: projects are archived, work items, releases and sprints stay.

CREATE TABLE pj_project (
    project_id uuid NOT NULL,
    project_key varchar(20) NOT NULL,
    prefix varchar(10) NOT NULL,
    name varchar(100) NOT NULL,
    description text,
    trackers jsonb DEFAULT '[]' NOT NULL,
    components jsonb DEFAULT '[]' NOT NULL,
    uses_sprints boolean DEFAULT 0 NOT NULL,
    next_number integer DEFAULT 1 NOT NULL,
    archived_at timestamptz,
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    created_by uuid,
    updated_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    updated_by uuid,
    CONSTRAINT pj_project_pkey PRIMARY KEY (project_id)
-- [jooq ignore start]
    , CONSTRAINT ck_pj_project_next_number CHECK (next_number >= 1)
    , CONSTRAINT ck_pj_project_key CHECK (length(project_key) BETWEEN 2 AND 20)
    , CONSTRAINT ck_pj_project_prefix CHECK (length(prefix) BETWEEN 2 AND 10)
-- [jooq ignore stop]
);

CREATE UNIQUE INDEX ux_pj_project_key ON pj_project (project_key);
CREATE UNIQUE INDEX ux_pj_project_prefix ON pj_project (prefix);

CREATE TABLE pj_member (
    project_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role varchar(16) NOT NULL,
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    CONSTRAINT pj_member_pkey PRIMARY KEY (project_id, user_id)
-- [jooq ignore start]
    , CONSTRAINT ck_pj_member_role CHECK (role IN ('PM', 'DEVELOPER', 'PLANNER', 'DESIGNER', 'MEMBER'))
    , CONSTRAINT pj_member_project_fk FOREIGN KEY (project_id) REFERENCES pj_project(project_id) ON DELETE CASCADE
    , CONSTRAINT pj_member_user_fk FOREIGN KEY (user_id) REFERENCES users(user_id)
-- [jooq ignore stop]
);

CREATE INDEX pj_member_user_idx ON pj_member (user_id);

CREATE TABLE pj_release (
    release_id uuid NOT NULL,
    project_id uuid NOT NULL,
    name varchar(50) NOT NULL,
    due_date date NOT NULL,
    released_on date,
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    CONSTRAINT pj_release_pkey PRIMARY KEY (release_id)
-- [jooq ignore start]
    , CONSTRAINT pj_release_project_fk FOREIGN KEY (project_id) REFERENCES pj_project(project_id)
-- [jooq ignore stop]
);

CREATE INDEX pj_release_project_idx ON pj_release (project_id, due_date);

CREATE TABLE pj_sprint (
    sprint_id uuid NOT NULL,
    project_id uuid NOT NULL,
    name varchar(50) NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    state varchar(16) DEFAULT 'PLANNED' NOT NULL,
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    CONSTRAINT pj_sprint_pkey PRIMARY KEY (sprint_id)
-- [jooq ignore start]
    , CONSTRAINT ck_pj_sprint_state CHECK (state IN ('PLANNED', 'ACTIVE', 'CLOSED'))
    , CONSTRAINT ck_pj_sprint_dates CHECK (end_date >= start_date)
    , CONSTRAINT pj_sprint_project_fk FOREIGN KEY (project_id) REFERENCES pj_project(project_id)
-- [jooq ignore stop]
);

CREATE INDEX pj_sprint_project_idx ON pj_sprint (project_id);
-- [jooq ignore start]
-- One sprint at a time is under way in a project.
CREATE UNIQUE INDEX ux_pj_sprint_active ON pj_sprint (project_id) WHERE state = 'ACTIVE';
-- [jooq ignore stop]

CREATE TABLE pj_work_item (
    work_item_id uuid NOT NULL,
    project_id uuid NOT NULL,
    number integer NOT NULL,
    tracker varchar(50) NOT NULL,
    subject varchar(200) NOT NULL,
    description text,
    status varchar(16) DEFAULT 'NEW' NOT NULL,
    priority varchar(16) DEFAULT 'NORMAL' NOT NULL,
    assignee_id uuid,
    author_id uuid NOT NULL,
    parent_id uuid,
    component varchar(50),
    release_id uuid,
    sprint_id uuid,
    start_date date,
    due_date date,
    done_ratio integer DEFAULT 0 NOT NULL,
    estimated_hours numeric(6,2),
    closed_on date,
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    created_by uuid,
    updated_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    updated_by uuid,
    CONSTRAINT pj_work_item_pkey PRIMARY KEY (work_item_id)
-- [jooq ignore start]
    , CONSTRAINT ck_pj_work_item_status CHECK (status IN ('NEW', 'PROGRESS', 'FEEDBACK', 'DONE', 'REJECTED'))
    , CONSTRAINT ck_pj_work_item_priority CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT', 'IMMEDIATE'))
    , CONSTRAINT ck_pj_work_item_done_ratio CHECK (done_ratio BETWEEN 0 AND 100)
    , CONSTRAINT ck_pj_work_item_number CHECK (number >= 1)
    , CONSTRAINT pj_work_item_project_fk FOREIGN KEY (project_id) REFERENCES pj_project(project_id)
    , CONSTRAINT pj_work_item_assignee_fk FOREIGN KEY (assignee_id) REFERENCES users(user_id)
    , CONSTRAINT pj_work_item_author_fk FOREIGN KEY (author_id) REFERENCES users(user_id)
    , CONSTRAINT pj_work_item_parent_fk FOREIGN KEY (parent_id) REFERENCES pj_work_item(work_item_id)
    , CONSTRAINT pj_work_item_release_fk FOREIGN KEY (release_id) REFERENCES pj_release(release_id)
    , CONSTRAINT pj_work_item_sprint_fk FOREIGN KEY (sprint_id) REFERENCES pj_sprint(sprint_id)
-- [jooq ignore stop]
);

CREATE UNIQUE INDEX ux_pj_work_item_number ON pj_work_item (project_id, number);
CREATE INDEX pj_work_item_status_idx ON pj_work_item (status, due_date);
CREATE INDEX pj_work_item_assignee_idx ON pj_work_item (assignee_id);
CREATE INDEX pj_work_item_parent_idx ON pj_work_item (parent_id);
CREATE INDEX pj_work_item_sprint_idx ON pj_work_item (sprint_id);
CREATE INDEX pj_work_item_release_idx ON pj_work_item (release_id);

CREATE TABLE pj_journal (
    journal_id uuid NOT NULL,
    work_item_id uuid NOT NULL,
    author_id uuid NOT NULL,
    kind varchar(16) NOT NULL,
    from_status varchar(16),
    to_status varchar(16),
    text text,
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    CONSTRAINT pj_journal_pkey PRIMARY KEY (journal_id)
-- [jooq ignore start]
    , CONSTRAINT ck_pj_journal_kind CHECK (kind IN ('STATUS', 'COMMENT'))
    , CONSTRAINT pj_journal_work_item_fk FOREIGN KEY (work_item_id) REFERENCES pj_work_item(work_item_id)
    , CONSTRAINT pj_journal_author_fk FOREIGN KEY (author_id) REFERENCES users(user_id)
-- [jooq ignore stop]
);

CREATE INDEX pj_journal_work_item_idx ON pj_journal (work_item_id, created_at);

CREATE TABLE pj_time_entry (
    time_entry_id uuid NOT NULL,
    work_item_id uuid NOT NULL,
    user_id uuid NOT NULL,
    work_date date NOT NULL,
    hours numeric(4,2) NOT NULL,
    activity varchar(16) NOT NULL,
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    CONSTRAINT pj_time_entry_pkey PRIMARY KEY (time_entry_id)
-- [jooq ignore start]
    , CONSTRAINT ck_pj_time_entry_hours CHECK (hours > 0 AND hours <= 24)
    , CONSTRAINT ck_pj_time_entry_activity CHECK (activity IN ('ANALYSIS', 'DEVELOPMENT', 'DESIGN', 'FIX', 'TEST'))
    , CONSTRAINT pj_time_entry_work_item_fk FOREIGN KEY (work_item_id) REFERENCES pj_work_item(work_item_id)
    , CONSTRAINT pj_time_entry_user_fk FOREIGN KEY (user_id) REFERENCES users(user_id)
-- [jooq ignore stop]
);

CREATE INDEX pj_time_entry_work_item_idx ON pj_time_entry (work_item_id, work_date);
CREATE INDEX pj_time_entry_date_idx ON pj_time_entry (work_date);

CREATE TABLE pj_wiki_folder (
    folder_id uuid NOT NULL,
    project_id uuid NOT NULL,
    name varchar(50) NOT NULL,
    view_access varchar(16) DEFAULT 'EVERYONE' NOT NULL,
    upload_access varchar(16) DEFAULT 'MEMBERS' NOT NULL,
    position integer NOT NULL,
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    CONSTRAINT pj_wiki_folder_pkey PRIMARY KEY (folder_id)
-- [jooq ignore start]
    , CONSTRAINT ck_pj_wiki_folder_view CHECK (view_access IN ('EVERYONE', 'PM'))
    , CONSTRAINT ck_pj_wiki_folder_upload CHECK (upload_access IN ('MEMBERS', 'PM'))
    , CONSTRAINT pj_wiki_folder_project_fk FOREIGN KEY (project_id) REFERENCES pj_project(project_id)
-- [jooq ignore stop]
);

CREATE INDEX pj_wiki_folder_project_idx ON pj_wiki_folder (project_id, position);

CREATE TABLE pj_wiki_file (
    file_id uuid NOT NULL,
    folder_id uuid NOT NULL,
    name varchar(256) NOT NULL,
    size bigint NOT NULL,
    content_type varchar(128) NOT NULL,
    author_id uuid NOT NULL,
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    CONSTRAINT pj_wiki_file_pkey PRIMARY KEY (file_id)
-- [jooq ignore start]
    , CONSTRAINT pj_wiki_file_folder_fk FOREIGN KEY (folder_id) REFERENCES pj_wiki_folder(folder_id)
    , CONSTRAINT pj_wiki_file_author_fk FOREIGN KEY (author_id) REFERENCES users(user_id)
-- [jooq ignore stop]
);

CREATE INDEX pj_wiki_file_folder_idx ON pj_wiki_file (folder_id);
