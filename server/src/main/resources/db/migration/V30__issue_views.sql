-- Saved views over issues (BIT's views): the pills over an issue list. A view belongs to one scope,
-- the area's list across the projects (project_id null) or one project's, and keeps how that list is shown: its name,
-- mark (icon and colour), layout (목록 or 보드, a board only in a project), filters as the list's address names them, order
-- and grouping. A shared view is for everyone (Projects administrators keep it); a personal one only its owner sees and
-- keeps. Views a scope starts with have no owner. The built-in 전체 이슈 is not stored; its key 'all' only names it in an order.
CREATE TABLE issue_view (
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
    CONSTRAINT issue_view_pkey PRIMARY KEY (view_id)
-- [jooq ignore start]
    , CONSTRAINT issue_view_project_fkey FOREIGN KEY (project_id) REFERENCES project (project_id) ON DELETE CASCADE
    , CONSTRAINT issue_view_personal CHECK (is_personal IN (0, 1) AND (is_personal = 0 OR owner_id IS NOT NULL))
    , CONSTRAINT issue_view_name CHECK (length(trim(name)) > 0)
    , CONSTRAINT issue_view_color CHECK (color GLOB '#[0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f]')
    , CONSTRAINT issue_view_layout CHECK (layout IN ('LIST', 'BOARD') AND (layout = 'LIST' OR project_id IS NOT NULL))
    , CONSTRAINT issue_view_filters CHECK (length(filters) <= 8000 AND json_valid(filters) AND json_type(filters) = 'object')
    , CONSTRAINT issue_view_sort CHECK (sort IN ('BOARD', 'UPDATED', 'CREATED'))
    , CONSTRAINT issue_view_direction CHECK (direction IN ('ASC', 'DESC'))
    , CONSTRAINT issue_view_grouping CHECK (grouping IN ('STATUS', 'ASSIGNEE', 'PRIORITY', 'TYPE', 'PROJECT', 'NONE'))
-- [jooq ignore stop]
);
CREATE INDEX ix_issue_view_scope ON issue_view (project_id, created_at, view_id);

-- A scope's order of its shared views (BIT's issue_view_order, D-088): 'area' or a project's id, and the keys in order,
-- view ids and 'all'. The first is the scope's default view, the one its list opens with. A shared view missing from it
-- follows in the order it was made; personal views follow them all.
CREATE TABLE issue_view_order (
    scope varchar(40) NOT NULL,
    view_keys text NOT NULL,
    updated_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    updated_by uuid,
    CONSTRAINT issue_view_order_pkey PRIMARY KEY (scope)
-- [jooq ignore start]
    , CONSTRAINT issue_view_order_keys CHECK (length(view_keys) <= 8000 AND json_valid(view_keys) AND json_type(view_keys) = 'array')
-- [jooq ignore stop]
);

-- The views every scope starts with, after 전체 이슈 (SavedView.starters): the area's 내 이슈, and each project's 보드 (the
-- 보드 its tabs had) and 내 이슈. New projects get theirs as they are made.
-- [jooq ignore start]
WITH starter(scope, step, name, icon, color, layout, filters, sort, direction) AS (VALUES
    ('area', 0, '내 이슈', 'user', '#4cb782', 'LIST', '{"assignee":"me"}', 'UPDATED', 'DESC'),
    ('project', 0, '보드', 'layout-board', '#f2c94c', 'BOARD', '{}', 'BOARD', 'ASC'),
    ('project', 1, '내 이슈', 'user', '#4cb782', 'LIST', '{"assignee":"me"}', 'BOARD', 'ASC')
), scope(project_id, kind) AS (
    SELECT NULL, 'area'
    UNION ALL SELECT project_id, 'project' FROM project
)
INSERT INTO issue_view (view_id, project_id, owner_id, is_personal, name, icon, color, layout, filters, sort, direction, grouping,
    created_at, updated_at)
SELECT
    lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)), 2) || '-'
        || substr('89ab', 1 + (abs(random()) % 4), 1) || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6))),
    scope.project_id, NULL, 0, starter.name, starter.icon, starter.color, starter.layout, starter.filters, starter.sort,
    starter.direction, 'STATUS',
    strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || printf('%03d', starter.step) || 'Z',
    strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z'
FROM scope JOIN starter ON starter.scope = scope.kind
ORDER BY scope.project_id, starter.step;
-- [jooq ignore stop]
