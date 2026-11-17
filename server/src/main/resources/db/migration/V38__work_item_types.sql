-- Work item types are the workspace's (BIT D-104; 결정기록 2026-11-04 프로젝트 관리): each its code (what an issue keeps),
-- name, mark (a Solar icon in a #RRGGBB colour) and place in the menus; one of them is the default a new work item takes
-- when none is named. The four fixed types come in as they were (작업 · 버그 · 기능 · 에픽, 작업 the default).
CREATE TABLE work_item_type (
    code varchar(16) NOT NULL,
    name varchar(32) NOT NULL,
    icon varchar(40) NOT NULL,
    color varchar(7) NOT NULL,
    "position" integer NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    created_by uuid,
    updated_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    updated_by uuid,
    CONSTRAINT work_item_type_pkey PRIMARY KEY (code)
-- [jooq ignore start]
    , CONSTRAINT work_item_type_color CHECK (color GLOB '#[0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f]')
-- [jooq ignore stop]
);
CREATE INDEX ix_work_item_type_position ON work_item_type ("position", code);

-- [jooq ignore start]
CREATE UNIQUE INDEX ux_work_item_type_name ON work_item_type (lower(name));

INSERT INTO work_item_type (code, name, icon, color, "position", is_default) VALUES
    ('TASK', '작업', 'checklist', '#95959f', 0, 1),
    ('BUG', '버그', 'bug', '#eb5757', 1, 0),
    ('FEATURE', '기능', 'idea', '#f2994a', 2, 0),
    ('EPIC', '에픽', 'epic', '#5e6ad2', 3, 0);

-- An issue's type was held to the four fixed codes by a CHECK, which SQLite cannot drop: the table is made again, its
-- type now any type's code (a key into work_item_type), its rows, labels and indexes kept. The labels on issues are set
-- aside first, as dropping the old table takes them with it; the parent links are checked once all rows are in.
PRAGMA defer_foreign_keys = ON;

CREATE TABLE issue_label_link_kept AS SELECT * FROM issue_label_link;

CREATE TABLE issue_next (
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
    CONSTRAINT issue_next_pkey PRIMARY KEY (issue_id)
    , CONSTRAINT issue_next_project_fkey FOREIGN KEY (project_id) REFERENCES project (project_id) ON DELETE CASCADE
    , CONSTRAINT issue_next_column_fkey FOREIGN KEY (column_id) REFERENCES issue_column (column_id) ON DELETE RESTRICT
    , CONSTRAINT issue_next_parent_fkey FOREIGN KEY (parent_id) REFERENCES issue_next (issue_id) ON DELETE SET NULL
    , CONSTRAINT issue_next_type_fkey FOREIGN KEY (type) REFERENCES work_item_type (code) ON DELETE RESTRICT
    , CONSTRAINT issue_next_priority CHECK (priority IN ('NONE', 'URGENT', 'HIGH', 'MEDIUM', 'LOW'))
    , CONSTRAINT issue_next_dates CHECK (start_date IS NULL OR due_date IS NULL OR start_date <= due_date)
);

INSERT INTO issue_next SELECT issue_id, project_id, number, title, type, column_id, "position", priority, assignee_id,
    start_date, due_date, parent_id, closed_at, version, created_at, created_by, updated_at, updated_by, deleted_at, deleted_by
FROM issue;

DROP TABLE issue;
ALTER TABLE issue_next RENAME TO issue;
CREATE UNIQUE INDEX ux_issue_project_number ON issue (project_id, number);
CREATE INDEX ix_issue_column_position ON issue (column_id, "position", issue_id);
CREATE INDEX ix_issue_updated ON issue (updated_at, issue_id);
CREATE INDEX ix_issue_assignee ON issue (assignee_id);
CREATE INDEX ix_issue_parent ON issue (parent_id);
CREATE INDEX ix_issue_type ON issue (type);

INSERT INTO issue_label_link SELECT * FROM issue_label_link_kept;
DROP TABLE issue_label_link_kept;

-- The timeline names a type change by the types' names, as it names columns, so a type renamed or gone still reads.
UPDATE activity_entry SET
    before_value = coalesce((SELECT name FROM work_item_type WHERE code = activity_entry.before_value), before_value),
    after_value = coalesce((SELECT name FROM work_item_type WHERE code = activity_entry.after_value), after_value)
WHERE owner_type = 'PROJECT_ISSUE' AND kind = 'EVENT' AND field = 'TYPE';
-- [jooq ignore stop]
