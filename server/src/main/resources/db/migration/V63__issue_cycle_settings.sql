-- 프로젝트의 사이클 설정(리니어의 Cycles 설정): 쓰는지, 한 사이클의 주 수, 시작 요일(1 월요일 ~ 7 일요일), 미리 만들어 둘
-- 다음 사이클 수, 업무가 진행 중·완료가 되면 지금 사이클에 넣을지. 설정이 없는 프로젝트는 사이클을 쓰지 않는다.
CREATE TABLE issue_cycle_settings (
    project_id uuid NOT NULL,
    is_enabled boolean DEFAULT 0 NOT NULL,
    weeks integer DEFAULT 2 NOT NULL,
    start_day integer DEFAULT 1 NOT NULL,
    upcoming integer DEFAULT 2 NOT NULL,
    adds_started boolean DEFAULT 1 NOT NULL,
    adds_completed boolean DEFAULT 1 NOT NULL,
    updated_at timestamptz NOT NULL,
    updated_by uuid,
    CONSTRAINT issue_cycle_settings_pkey PRIMARY KEY (project_id)
-- [jooq ignore start]
    , CONSTRAINT issue_cycle_settings_project_fkey FOREIGN KEY (project_id) REFERENCES project (project_id) ON DELETE CASCADE
    , CONSTRAINT issue_cycle_settings_weeks CHECK (weeks BETWEEN 1 AND 8)
    , CONSTRAINT issue_cycle_settings_start_day CHECK (start_day BETWEEN 1 AND 7)
    , CONSTRAINT issue_cycle_settings_upcoming CHECK (upcoming BETWEEN 0 AND 6)
-- [jooq ignore stop]
);

-- 이미 사이클을 만든 프로젝트는 쓰는 것으로 둔다(자동으로 만들기는 0, 업무 자동 넣기는 끔: 지금 쓰던 대로).
-- [jooq ignore start]
INSERT INTO issue_cycle_settings (project_id, is_enabled, weeks, start_day, upcoming, adds_started, adds_completed, updated_at)
SELECT DISTINCT project_id, 1, 2, 1, 0, 0, 0, strftime('%Y-%m-%dT%H:%M:%S', 'now') || '.000000Z'
FROM issue_cycle;
-- [jooq ignore stop]
