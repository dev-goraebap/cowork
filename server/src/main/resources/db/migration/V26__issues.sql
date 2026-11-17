-- Stage two of the projects area: a project's issues, on BIT's work items. Each project keeps its
-- board's columns (a work flow of statuses, each in one of five categories) and its labels; an issue lives in one column,
-- carries a number from the project's counter (project.last_work_item_number) and keeps a body written in the shared
-- body editor, whose versions and comment threads sit in the rich_body tables below for any owner to use.

-- A project's board columns, the statuses its issues move through, in their order. category says what the column means
-- whatever it is called: BACKLOG (not planned), UNSTARTED, STARTED, COMPLETED and CANCELED (the last two close an issue).
CREATE TABLE issue_column (
    column_id uuid NOT NULL,
    project_id uuid NOT NULL,
    name varchar(32) NOT NULL,
    category varchar(16) NOT NULL,
    "position" integer NOT NULL,
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    created_by uuid,
    updated_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    updated_by uuid,
    CONSTRAINT issue_column_pkey PRIMARY KEY (column_id)
-- [jooq ignore start]
    , CONSTRAINT issue_column_project_fkey FOREIGN KEY (project_id) REFERENCES project (project_id) ON DELETE CASCADE
    , CONSTRAINT issue_column_category CHECK (category IN ('BACKLOG', 'UNSTARTED', 'STARTED', 'COMPLETED', 'CANCELED'))
-- [jooq ignore stop]
);
CREATE INDEX ix_issue_column_project ON issue_column (project_id, "position");

-- A project's labels, which anyone puts on its issues and Projects administrators keep. The name is unique in the
-- project whatever its case.
CREATE TABLE issue_label (
    label_id uuid NOT NULL,
    project_id uuid NOT NULL,
    name varchar(32) NOT NULL,
    color varchar(7) NOT NULL,
    "position" integer NOT NULL,
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    created_by uuid,
    updated_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    updated_by uuid,
    CONSTRAINT issue_label_pkey PRIMARY KEY (label_id)
-- [jooq ignore start]
    , CONSTRAINT issue_label_project_fkey FOREIGN KEY (project_id) REFERENCES project (project_id) ON DELETE CASCADE
    , CONSTRAINT issue_label_color CHECK (color GLOB '#[0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f]')
-- [jooq ignore stop]
);
CREATE INDEX ix_issue_label_project ON issue_label (project_id, "position");
-- [jooq ignore start]
CREATE UNIQUE INDEX ux_issue_label_name ON issue_label (project_id, lower(name));
-- [jooq ignore stop]

-- An issue: its number in the project (KEY-number), title, type, column and place in it (a fraction between its
-- neighbours'), priority, assignee, dates, parent issue in the same project, when its column closed it, and its version
-- for optimistic locking of what the properties show. Its body is kept apart (rich_body, owner the issue). A deleted
-- issue stays for its number and history.
CREATE TABLE issue (
    issue_id uuid NOT NULL,
    project_id uuid NOT NULL,
    number bigint NOT NULL,
    title varchar(200) NOT NULL,
    type varchar(16) NOT NULL,
    column_id uuid NOT NULL,
    "position" double precision NOT NULL,
    priority varchar(8) NOT NULL,
    assignee_id uuid,
    start_date date,
    due_date date,
    parent_id uuid,
    closed_at timestamptz,
    version bigint DEFAULT 0 NOT NULL,
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    created_by uuid,
    updated_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    updated_by uuid,
    deleted_at timestamptz,
    deleted_by uuid,
    CONSTRAINT issue_pkey PRIMARY KEY (issue_id)
-- [jooq ignore start]
    , CONSTRAINT issue_project_fkey FOREIGN KEY (project_id) REFERENCES project (project_id) ON DELETE CASCADE
    , CONSTRAINT issue_column_fkey FOREIGN KEY (column_id) REFERENCES issue_column (column_id) ON DELETE RESTRICT
    , CONSTRAINT issue_parent_fkey FOREIGN KEY (parent_id) REFERENCES issue (issue_id) ON DELETE SET NULL
    , CONSTRAINT issue_type CHECK (type IN ('TASK', 'BUG', 'FEATURE', 'EPIC'))
    , CONSTRAINT issue_priority CHECK (priority IN ('NONE', 'URGENT', 'HIGH', 'MEDIUM', 'LOW'))
    , CONSTRAINT issue_dates CHECK (start_date IS NULL OR due_date IS NULL OR start_date <= due_date)
-- [jooq ignore stop]
);
CREATE UNIQUE INDEX ux_issue_project_number ON issue (project_id, number);
CREATE INDEX ix_issue_column_position ON issue (column_id, "position", issue_id);
CREATE INDEX ix_issue_updated ON issue (updated_at, issue_id);
CREATE INDEX ix_issue_assignee ON issue (assignee_id);
CREATE INDEX ix_issue_parent ON issue (parent_id);

-- The labels on an issue.
CREATE TABLE issue_label_link (
    issue_id uuid NOT NULL,
    label_id uuid NOT NULL,
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    created_by uuid,
    CONSTRAINT issue_label_link_pkey PRIMARY KEY (issue_id, label_id)
-- [jooq ignore start]
    , CONSTRAINT issue_label_link_issue_fkey FOREIGN KEY (issue_id) REFERENCES issue (issue_id) ON DELETE CASCADE
    , CONSTRAINT issue_label_link_label_fkey FOREIGN KEY (label_id) REFERENCES issue_label (label_id) ON DELETE CASCADE
-- [jooq ignore stop]
);
CREATE INDEX ix_issue_label_link_label ON issue_label_link (label_id, issue_id);

-- What happened to an issue, for its timeline: made, and each property changed, with the value before and after as
-- the timeline shows them (a column's or label's name then, a person's id, a date, a type or priority code).
CREATE TABLE issue_activity (
    activity_id uuid NOT NULL,
    issue_id uuid NOT NULL,
    field varchar(16) NOT NULL,
    before_value varchar(400),
    after_value varchar(400),
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    created_by uuid,
    CONSTRAINT issue_activity_pkey PRIMARY KEY (activity_id)
-- [jooq ignore start]
    , CONSTRAINT issue_activity_issue_fkey FOREIGN KEY (issue_id) REFERENCES issue (issue_id) ON DELETE CASCADE
-- [jooq ignore stop]
);
CREATE INDEX ix_issue_activity_issue ON issue_activity (issue_id, created_at);

-- The discussion under an issue, plain text; its writer edits or deletes their own.
CREATE TABLE issue_comment (
    comment_id uuid NOT NULL,
    issue_id uuid NOT NULL,
    body text NOT NULL,
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    created_by uuid NOT NULL,
    edited_at timestamptz,
    deleted_at timestamptz,
    CONSTRAINT issue_comment_pkey PRIMARY KEY (comment_id)
-- [jooq ignore start]
    , CONSTRAINT issue_comment_issue_fkey FOREIGN KEY (issue_id) REFERENCES issue (issue_id) ON DELETE CASCADE
-- [jooq ignore stop]
);
CREATE INDEX ix_issue_comment_issue ON issue_comment (issue_id, created_at);

-- A body written in the shared body editor (Tiptap JSON, schema version 1), for any owner (an issue now, a document
-- later): the body, its comment threads' anchors, the last comment sequence and the version a save goes over.
CREATE TABLE rich_body (
    owner_id uuid NOT NULL,
    owner_type varchar(32) NOT NULL,
    body text NOT NULL,
    anchors text NOT NULL,
    comment_seq bigint DEFAULT 0 NOT NULL,
    version bigint DEFAULT 0 NOT NULL,
    updated_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    updated_by uuid,
    CONSTRAINT rich_body_pkey PRIMARY KEY (owner_id)
-- [jooq ignore start]
    , CONSTRAINT rich_body_json CHECK (json_valid(body) AND json_valid(anchors))
-- [jooq ignore stop]
);

-- A body kept as a version: the original before the first change (baseline), a checkpoint (automatic), the body before
-- a restore (before-restore) and the body restored (restored), with its anchors and comment sequence at that moment.
CREATE TABLE rich_body_revision (
    revision_id uuid NOT NULL,
    owner_id uuid NOT NULL,
    body text NOT NULL,
    anchors text NOT NULL,
    comment_seq bigint NOT NULL,
    reason varchar(16) NOT NULL,
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    created_by uuid,
    CONSTRAINT rich_body_revision_pkey PRIMARY KEY (revision_id)
-- [jooq ignore start]
    , CONSTRAINT rich_body_revision_owner_fkey FOREIGN KEY (owner_id) REFERENCES rich_body (owner_id) ON DELETE CASCADE
    , CONSTRAINT rich_body_revision_reason CHECK (reason IN ('baseline', 'automatic', 'before-restore', 'restored'))
-- [jooq ignore stop]
);
CREATE INDEX ix_rich_body_revision_owner ON rich_body_revision (owner_id, created_at);

-- A comment thread anchored in a body: where it points (kept current in rich_body.anchors), the comment sequence it
-- started at and the body version it was made on. Its messages and resolutions carry the sequence too, so a past version
-- shows the threads as they stood.
CREATE TABLE rich_body_thread (
    thread_id uuid NOT NULL,
    owner_id uuid NOT NULL,
    anchor text NOT NULL,
    created_seq bigint NOT NULL,
    origin_version bigint NOT NULL,
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    created_by uuid NOT NULL,
    CONSTRAINT rich_body_thread_pkey PRIMARY KEY (thread_id)
-- [jooq ignore start]
    , CONSTRAINT rich_body_thread_owner_fkey FOREIGN KEY (owner_id) REFERENCES rich_body (owner_id) ON DELETE CASCADE
-- [jooq ignore stop]
);
CREATE INDEX ix_rich_body_thread_owner ON rich_body_thread (owner_id, created_seq);

CREATE TABLE rich_body_message (
    message_id uuid NOT NULL,
    thread_id uuid NOT NULL,
    sequence bigint NOT NULL,
    body text NOT NULL,
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    created_by uuid NOT NULL,
    CONSTRAINT rich_body_message_pkey PRIMARY KEY (message_id)
-- [jooq ignore start]
    , CONSTRAINT rich_body_message_thread_fkey FOREIGN KEY (thread_id) REFERENCES rich_body_thread (thread_id) ON DELETE CASCADE
-- [jooq ignore stop]
);
CREATE INDEX ix_rich_body_message_thread ON rich_body_message (thread_id, sequence);

CREATE TABLE rich_body_resolution (
    thread_id uuid NOT NULL,
    sequence bigint NOT NULL,
    resolved boolean NOT NULL,
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    created_by uuid NOT NULL,
    CONSTRAINT rich_body_resolution_pkey PRIMARY KEY (thread_id, sequence)
-- [jooq ignore start]
    , CONSTRAINT rich_body_resolution_thread_fkey FOREIGN KEY (thread_id) REFERENCES rich_body_thread (thread_id) ON DELETE CASCADE
-- [jooq ignore stop]
);

-- Every project there is gets BIT's board (new projects get it when they are made).
-- [jooq ignore start]
INSERT INTO issue_column (column_id, project_id, name, category, "position")
SELECT lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-'
        || substr('89ab', 1 + abs(random()) % 4, 1) || substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6))),
    project.project_id, seed.name, seed.category, seed.position
FROM project
CROSS JOIN (
    SELECT '백로그' AS name, 'BACKLOG' AS category, 0 AS position
    UNION ALL SELECT '할 일', 'UNSTARTED', 1
    UNION ALL SELECT '진행 중', 'STARTED', 2
    UNION ALL SELECT '검토 중', 'STARTED', 3
    UNION ALL SELECT '완료', 'COMPLETED', 4
    UNION ALL SELECT '취소', 'CANCELED', 5
) seed;
-- [jooq ignore stop]
