-- 업무 공간의 이름이 워크스페이스가 되어(2026-11-15) 그 관리자 역할 PROJECTS_ADMIN도 WORKSPACE_ADMIN이 된다. 하는 일은 같다.
-- SQLite는 CHECK를 고칠 수 없어 표를 다시 만든다.
CREATE TABLE user_role_next (
    user_id uuid NOT NULL,
    role varchar(32) NOT NULL CHECK (role IN ('INSTANCE_ADMIN', 'OFFICE_ADMIN', 'WORKSPACE_ADMIN')),
    granted_at timestamptz NOT NULL,
    granted_by uuid,
    CONSTRAINT user_role_next_pkey PRIMARY KEY (user_id, role)
-- [jooq ignore start]
    , CONSTRAINT user_role_user_fk FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
-- [jooq ignore stop]
);

-- [jooq ignore start]
INSERT INTO user_role_next (user_id, role, granted_at, granted_by)
SELECT user_id, CASE role WHEN 'PROJECTS_ADMIN' THEN 'WORKSPACE_ADMIN' ELSE role END, granted_at, granted_by FROM user_role;
-- [jooq ignore stop]

DROP TABLE user_role;
ALTER TABLE user_role_next RENAME TO user_role;
