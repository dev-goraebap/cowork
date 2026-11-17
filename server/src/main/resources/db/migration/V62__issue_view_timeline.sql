-- 업무 뷰의 보기 방식에 타임라인(TIMELINE)을 더한다. SQLite는 CHECK를 고칠 수 없어 표를 다시 만든다.
-- 그리고 지금 있는 프로젝트마다 모두의 뷰 '일정 계획'(타임라인)을 하나 더해 뷰 순서 끝에 둔다. 있던 뷰는 그대로다.
CREATE TABLE issue_view_next (
    view_id uuid NOT NULL,
    project_id uuid,
    owner_id uuid,
    is_personal boolean DEFAULT 0 NOT NULL,
    name varchar(32) NOT NULL,
    icon varchar(64) NOT NULL,
    color varchar(7) NOT NULL,
    layout varchar(8) NOT NULL,
    filters text NOT NULL,
    sort varchar(8) NOT NULL,
    direction varchar(4) NOT NULL,
    grouping varchar(16) NOT NULL,
    version bigint DEFAULT 0 NOT NULL,
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    created_by uuid,
    updated_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    updated_by uuid,
    CONSTRAINT issue_view_next_pkey PRIMARY KEY (view_id)
-- [jooq ignore start]
    , CONSTRAINT issue_view_project_fkey FOREIGN KEY (project_id) REFERENCES project (project_id) ON DELETE CASCADE
    , CONSTRAINT issue_view_personal CHECK (is_personal IN (0, 1) AND (is_personal = 0 OR owner_id IS NOT NULL))
    , CONSTRAINT issue_view_name CHECK (length(trim(name)) > 0)
    , CONSTRAINT issue_view_color CHECK (color GLOB '#[0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f]')
    , CONSTRAINT issue_view_layout CHECK (layout IN ('LIST', 'BOARD', 'TIMELINE'))
    , CONSTRAINT issue_view_filters CHECK (length(filters) <= 8000 AND json_valid(filters) AND json_type(filters) = 'object')
    , CONSTRAINT issue_view_sort CHECK (sort IN ('BOARD', 'UPDATED', 'CREATED'))
    , CONSTRAINT issue_view_direction CHECK (direction IN ('ASC', 'DESC'))
    , CONSTRAINT issue_view_grouping CHECK (grouping IN ('STATUS', 'ASSIGNEE', 'PRIORITY', 'TYPE', 'PROJECT', 'NONE'))
-- [jooq ignore stop]
);

-- [jooq ignore start]
INSERT INTO issue_view_next
SELECT view_id, project_id, owner_id, is_personal, name, icon, color, layout, filters, sort, direction, grouping,
    version, created_at, created_by, updated_at, updated_by
FROM issue_view;
-- [jooq ignore stop]

DROP TABLE issue_view;
ALTER TABLE issue_view_next RENAME TO issue_view;
CREATE INDEX ix_issue_view_scope ON issue_view (project_id, created_at, view_id);

-- [jooq ignore start]
CREATE TEMPORARY TABLE timeline_seed AS
SELECT p.project_id AS project_id,
    lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-'
        || substr('89ab', 1 + (abs(random()) % 4), 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6))) AS view_id
FROM project p
WHERE p.deleted_at IS NULL
  AND EXISTS (SELECT 1 FROM issue_view_order o WHERE o.scope = p.project_id);

INSERT INTO issue_view (view_id, project_id, owner_id, is_personal, name, icon, color, layout, filters, sort, direction, grouping)
SELECT view_id, project_id, NULL, 0, '일정 계획', 'layout-timeline', '#5e6ad2', 'TIMELINE', '{}', 'BOARD', 'ASC', 'NONE'
FROM timeline_seed;

UPDATE issue_view_order
SET view_keys = json_insert(view_keys, '$[#]', (SELECT s.view_id FROM timeline_seed s WHERE s.project_id = issue_view_order.scope))
WHERE scope IN (SELECT project_id FROM timeline_seed);

DROP TABLE timeline_seed;
-- [jooq ignore stop]
