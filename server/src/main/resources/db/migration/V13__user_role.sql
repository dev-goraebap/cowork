-- The one administrator flag becomes three roles a member holds apart (DR-gishbptbmu): INSTANCE_ADMIN runs the system
-- screens and gives out roles, OFFICE_ADMIN runs the office's administration, PROJECTS_ADMIN runs the workspace's. None
-- holds another. Those who were administrators keep what they did, running the office; instance administrators are
-- named by e-mail in the server's settings (INSTANCE_ADMIN_EMAILS) and given the role when it starts.

CREATE TABLE user_role (
    user_id uuid NOT NULL,
    role varchar(32) NOT NULL CHECK (role IN ('INSTANCE_ADMIN', 'OFFICE_ADMIN', 'PROJECTS_ADMIN')),
    granted_at timestamptz NOT NULL,
    granted_by uuid,
    CONSTRAINT user_role_pkey PRIMARY KEY (user_id, role)
-- [jooq ignore start]
    , CONSTRAINT user_role_user_fk FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
-- [jooq ignore stop]
);

-- [jooq ignore start]
INSERT INTO user_role (user_id, role, granted_at)
SELECT user_id, 'OFFICE_ADMIN', strftime('%Y-%m-%dT%H:%M:%f000Z', 'now') FROM users WHERE is_admin;
-- [jooq ignore stop]

ALTER TABLE users DROP COLUMN is_admin;
