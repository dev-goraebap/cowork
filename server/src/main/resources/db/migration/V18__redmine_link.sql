-- Who each member is in a Redmine while Redmine keeps the projects' data: one Redmine user per
-- member and one member per Redmine user. The login is what the connection names to act as the member
-- (X-Redmine-Switch-User). linked_by is empty for a link made by matching names.
CREATE TABLE pj_redmine_link (
    user_id uuid NOT NULL,
    redmine_user_id integer NOT NULL,
    redmine_login varchar(255) NOT NULL,
    linked_by uuid,
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    CONSTRAINT pj_redmine_link_pkey PRIMARY KEY (user_id),
    CONSTRAINT pj_redmine_link_redmine_uk UNIQUE (redmine_user_id)
-- [jooq ignore start]
    , CONSTRAINT pj_redmine_link_user_fk FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
-- [jooq ignore stop]
);
