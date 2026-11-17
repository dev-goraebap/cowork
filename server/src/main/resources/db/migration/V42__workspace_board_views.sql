-- 전역 칸반을 저장한다. 기존 뷰의 ID·내용·순서는 보존한다.
-- [jooq ignore start]
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
    CONSTRAINT issue_view_pkey PRIMARY KEY (view_id)

    , CONSTRAINT issue_view_project_fkey FOREIGN KEY (project_id) REFERENCES project (project_id) ON DELETE CASCADE
    , CONSTRAINT issue_view_personal CHECK (is_personal IN (0, 1) AND (is_personal = 0 OR owner_id IS NOT NULL))
    , CONSTRAINT issue_view_name CHECK (length(trim(name)) > 0)
    , CONSTRAINT issue_view_color CHECK (color GLOB '#[0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f]')
    , CONSTRAINT issue_view_layout CHECK (layout IN ('LIST', 'BOARD'))
    , CONSTRAINT issue_view_filters CHECK (length(filters) <= 8000 AND json_valid(filters) AND json_type(filters) = 'object')
    , CONSTRAINT issue_view_sort CHECK (sort IN ('BOARD', 'UPDATED', 'CREATED'))
    , CONSTRAINT issue_view_direction CHECK (direction IN ('ASC', 'DESC'))
    , CONSTRAINT issue_view_grouping CHECK (grouping IN ('STATUS', 'ASSIGNEE', 'PRIORITY', 'TYPE', 'PROJECT', 'NONE'))

);
INSERT INTO issue_view_next SELECT * FROM issue_view;
DROP TABLE issue_view;
ALTER TABLE issue_view_next RENAME TO issue_view;
CREATE INDEX ix_issue_view_scope ON issue_view (project_id, created_at, view_id);

-- 수정되지 않은 옛 시스템 뷰만 새 기본 구성으로 바꾼다.
UPDATE issue_view SET name='칸반보드'
WHERE project_id IS NOT NULL AND owner_id IS NULL AND version=0
  AND name='보드' AND layout='BOARD' AND filters='{}'
  AND icon='layout-board' AND color='#f2c94c' AND sort='BOARD' AND direction='ASC' AND grouping='STATUS';
UPDATE issue_view SET name='백로그', icon='layout-list',
  filters=json_object('status',(SELECT group_concat(column_id,',') FROM
    (SELECT column_id FROM issue_column WHERE project_id=issue_view.project_id AND category='BACKLOG' ORDER BY position,column_id)))
WHERE project_id IS NOT NULL AND owner_id IS NULL AND version=0
  AND name='내 이슈' AND layout='LIST' AND filters='{"assignee":"me"}'
  AND icon='user' AND color='#4cb782' AND sort='BOARD' AND direction='ASC' AND grouping='STATUS'
  AND EXISTS(SELECT 1 FROM issue_column WHERE project_id=issue_view.project_id AND category='BACKLOG');

-- 빈 환경의 V30 전역 기본 뷰를 칸반보드로 전환하고 백로그를 한 번 추가한다.
CREATE TEMP TABLE upgraded_workspace_view AS
SELECT view_id FROM issue_view
WHERE project_id IS NULL AND owner_id IS NULL AND version=0
  AND name='내 이슈' AND layout='LIST' AND filters='{"assignee":"me"}'
  AND icon='user' AND color='#4cb782' AND sort='UPDATED' AND direction='DESC' AND grouping='STATUS'
  AND NOT EXISTS(SELECT 1 FROM issue_view existing WHERE existing.project_id IS NULL AND existing.is_personal=0 AND existing.name='칸반보드');
UPDATE issue_view SET name='칸반보드',icon='layout-board',color='#f2c94c',layout='BOARD',filters='{}'
WHERE view_id IN (SELECT view_id FROM upgraded_workspace_view);
INSERT INTO issue_view(view_id,project_id,owner_id,is_personal,name,icon,color,layout,filters,sort,direction,grouping)
SELECT lower(hex(randomblob(4))||'-'||hex(randomblob(2))||'-4'||substr(hex(randomblob(2)),2)||'-8'||substr(hex(randomblob(2)),2)||'-'||hex(randomblob(6))),
  NULL,NULL,0,'백로그','layout-list','#4cb782','LIST','{"status":"BACKLOG"}','UPDATED','DESC','STATUS'
WHERE EXISTS(SELECT 1 FROM upgraded_workspace_view)
  AND NOT EXISTS(SELECT 1 FROM issue_view WHERE project_id IS NULL AND is_personal=0 AND name='백로그');
INSERT INTO issue_view_order(scope,view_keys)
SELECT 'area',json_array('all',upgraded.view_id,
  (SELECT view_id FROM issue_view WHERE project_id IS NULL AND is_personal=0 AND name='백로그' ORDER BY created_at,view_id LIMIT 1))
FROM upgraded_workspace_view upgraded
WHERE NOT EXISTS(SELECT 1 FROM issue_view_order WHERE scope='area');
DROP TABLE upgraded_workspace_view;
-- [jooq ignore stop]
