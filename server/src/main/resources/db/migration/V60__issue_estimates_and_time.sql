-- 업무의 추정시간(분)과 스토리 포인트, 그리고 업무에 쓴 시간 기록.
-- 추정은 계획공수, 시간 기록의 합은 투입공수다(품질진단의 계획 대비 실적). 스토리 포인트는 스프린트 처리량에 쓴다.
ALTER TABLE issue ADD COLUMN estimate_minutes integer;
ALTER TABLE issue ADD COLUMN story_points double precision;

CREATE TABLE issue_time_entry (
    entry_id uuid NOT NULL,
    issue_id uuid NOT NULL,
    member_id uuid NOT NULL,
    spent_on date NOT NULL,
    minutes integer NOT NULL,
    note varchar(200),
    created_at timestamptz NOT NULL,
    created_by uuid,
    CONSTRAINT issue_time_entry_pkey PRIMARY KEY (entry_id)
-- [jooq ignore start]
    , CONSTRAINT issue_time_entry_issue_fkey FOREIGN KEY (issue_id) REFERENCES issue (issue_id) ON DELETE CASCADE
    , CONSTRAINT issue_time_entry_minutes CHECK (minutes > 0 AND minutes <= 1440)
-- [jooq ignore stop]
);
CREATE INDEX ix_issue_time_entry_issue ON issue_time_entry (issue_id, spent_on);
CREATE INDEX ix_issue_time_entry_member ON issue_time_entry (member_id, spent_on);
