-- The projects area is rebuilt on BIT's model. The old area's tables (work items, wiki, releases,
-- sprints, time entries, the Redmine copy and the GitLab links) are dropped: their rows are a copy of Redmine, kept in the
-- backup taken before this release. The office tags become the first projects: each tag is a project of the same id,
-- name and colour, so the events, minutes and overtime that named a tag now name its project, and the tag's background
-- text for the minutes' summaries becomes the project's description.

-- The old area, children before parents.
DROP TABLE pj_gitlab_mr;
DROP TABLE pj_gitlab_commit;
DROP TABLE pj_gitlab_repo;
DROP TABLE pj_redmine_sync;
DROP TABLE pj_redmine_link;
DROP TABLE pj_wiki_file;
DROP TABLE pj_wiki_folder;
DROP TABLE pj_time_entry;
DROP TABLE pj_journal;
DROP TABLE pj_work_item;
DROP TABLE pj_sprint;
DROP TABLE pj_release;
DROP TABLE pj_member;
DROP TABLE pj_project;
DROP TABLE pj_tracker;
-- The wiki's files lose their owner; the file module's cleanup removes the stored files no attachment names.
-- [jooq ignore start]
DELETE FROM attachment WHERE owner_type = 'PROJECT_WIKI_FILE';
-- [jooq ignore stop]

-- A project: its name, description, mark (an icon name and a #RRGGBB colour, or none for the key's first letter), its
-- place in the shared order, the last work item number it gave, when it was archived or deleted (kept, so what names it
-- still reads), and its version for optimistic locking. Renaming the tag table keeps the other tables' references.
ALTER TABLE project_tag RENAME TO project;
ALTER TABLE project RENAME COLUMN tag_id TO project_id;
ALTER TABLE project ADD COLUMN description text;
ALTER TABLE project ADD COLUMN icon varchar(32);
ALTER TABLE project ADD COLUMN color varchar(7);
ALTER TABLE project ADD COLUMN position integer NOT NULL DEFAULT 0;
ALTER TABLE project ADD COLUMN last_work_item_number bigint NOT NULL DEFAULT 0;
ALTER TABLE project ADD COLUMN archived_at timestamptz;
ALTER TABLE project ADD COLUMN deleted_at timestamptz;
ALTER TABLE project ADD COLUMN deleted_by uuid;
ALTER TABLE project ADD COLUMN version bigint NOT NULL DEFAULT 0;

-- [jooq ignore start]
UPDATE project SET
    color = CASE color_tone
        WHEN 'primary' THEN '#5e6ad2'
        WHEN 'success' THEN '#4cb782'
        WHEN 'warning' THEN '#f2994a'
        WHEN 'info' THEN '#26b5ce'
        WHEN 'danger' THEN '#eb5757'
        ELSE '#95959f' END,
    position = (SELECT COUNT(*) FROM project other
        WHERE other.display_order < project.display_order
            OR (other.display_order = project.display_order AND other.project_id < project.project_id)),
    description = (SELECT context.context_template FROM meeting_tag_context context WHERE context.tag_id = project.project_id);
-- [jooq ignore stop]
ALTER TABLE project DROP COLUMN color_tone;
ALTER TABLE project DROP COLUMN display_order;
DROP TABLE meeting_tag_context;

-- A project's keys, the prefix of its work item numbers: the current one and the ones it had, which stay its own so an
-- old number still finds it. A key is unique across every project, deleted ones too.
CREATE TABLE project_key (
    prefix varchar(10) NOT NULL,
    project_id uuid NOT NULL,
    is_current boolean NOT NULL,
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    CONSTRAINT project_key_pkey PRIMARY KEY (prefix)
-- [jooq ignore start]
    , CONSTRAINT project_key_project_fkey FOREIGN KEY (project_id) REFERENCES project (project_id) ON DELETE CASCADE
    , CONSTRAINT project_key_format CHECK (length(prefix) BETWEEN 2 AND 10 AND prefix NOT GLOB '*[^A-Z0-9]*')
-- [jooq ignore stop]
);
CREATE INDEX ix_project_key_project ON project_key (project_id);
-- [jooq ignore start]
CREATE UNIQUE INDEX ux_project_key_current ON project_key (project_id) WHERE is_current = 1;
-- [jooq ignore stop]
-- The tags' projects take P1, P2 … in their order; an administrator gives each its real key afterwards.
-- [jooq ignore start]
INSERT INTO project_key (prefix, project_id, is_current) SELECT 'P' || (position + 1), project_id, 1 FROM project;
-- [jooq ignore stop]

-- Who belongs to a project. Membership shows who works on it; it grants nothing.
CREATE TABLE project_member (
    project_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    created_by uuid,
    CONSTRAINT project_member_pkey PRIMARY KEY (project_id, user_id)
-- [jooq ignore start]
    , CONSTRAINT project_member_project_fkey FOREIGN KEY (project_id) REFERENCES project (project_id) ON DELETE CASCADE
    , CONSTRAINT project_member_user_fkey FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
-- [jooq ignore stop]
);
CREATE INDEX ix_project_member_user ON project_member (user_id);

-- A member's favourite projects, listed under 프로젝트 in their menu.
CREATE TABLE project_favorite (
    user_id uuid NOT NULL,
    project_id uuid NOT NULL,
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    CONSTRAINT project_favorite_pkey PRIMARY KEY (user_id, project_id)
-- [jooq ignore start]
    , CONSTRAINT project_favorite_project_fkey FOREIGN KEY (project_id) REFERENCES project (project_id) ON DELETE CASCADE
    , CONSTRAINT project_favorite_user_fkey FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
-- [jooq ignore stop]
);

-- What named a tag now names its project.
ALTER TABLE calendar_event RENAME COLUMN tag_id TO project_id;
ALTER TABLE meeting RENAME COLUMN tag_id TO project_id;
-- [jooq ignore start]
DROP INDEX meeting_tag_id_idx;
CREATE INDEX meeting_project_id_idx ON meeting (project_id);
-- [jooq ignore stop]
ALTER TABLE overtime_tag RENAME TO overtime_project;
ALTER TABLE overtime_project RENAME COLUMN tag_id TO project_id;
DROP INDEX ix_overtime_tag_tag;
CREATE INDEX ix_overtime_project_project ON overtime_project (project_id);
