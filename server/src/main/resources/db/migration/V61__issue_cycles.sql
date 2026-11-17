-- 프로젝트의 사이클(스프린트): 기간을 정해 업무를 묶고, 마치면 남은 업무를 다음 사이클로 넘긴다.
-- 업무는 사이클 하나에만 속한다. 사이클을 지우면 업무의 사이클은 서비스가 비운다.
CREATE TABLE issue_cycle (
    cycle_id uuid NOT NULL,
    project_id uuid NOT NULL,
    name varchar(80) NOT NULL,
    goal varchar(500),
    start_date date NOT NULL,
    end_date date NOT NULL,
    completed_at timestamptz,
    version bigint DEFAULT 0 NOT NULL,
    created_at timestamptz NOT NULL,
    created_by uuid,
    updated_at timestamptz NOT NULL,
    updated_by uuid,
    CONSTRAINT issue_cycle_pkey PRIMARY KEY (cycle_id)
-- [jooq ignore start]
    , CONSTRAINT issue_cycle_project_fkey FOREIGN KEY (project_id) REFERENCES project (project_id) ON DELETE CASCADE
    , CONSTRAINT issue_cycle_dates CHECK (start_date <= end_date)
-- [jooq ignore stop]
);
CREATE INDEX ix_issue_cycle_project ON issue_cycle (project_id, start_date);

ALTER TABLE issue ADD COLUMN cycle_id uuid;
CREATE INDEX ix_issue_cycle_id ON issue (cycle_id);
