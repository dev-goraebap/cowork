-- 문서함's permissions (docs/pending-records.md, 문서함 ②): a folder or a document with grants is closed to everyone but
-- them, each grant a subject (the item's maker, a member, a department with those under it, or a project's members)
-- and how far it goes (READ, WRITE, MANAGE). An item without grants takes what is above it; the space lets everyone
-- read and write. What one may do is the narrowest along the way down.
CREATE TABLE document_grant (
    grant_id uuid NOT NULL,
    target_type varchar(16) NOT NULL,
    target_id uuid NOT NULL,
    subject_type varchar(16) NOT NULL,
    subject_id uuid,
    level varchar(16) NOT NULL,
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    created_by uuid,
    CONSTRAINT document_grant_pkey PRIMARY KEY (grant_id)
-- [jooq ignore start]
    , CONSTRAINT document_grant_target CHECK (target_type IN ('FOLDER', 'DOCUMENT'))
    , CONSTRAINT document_grant_subject CHECK (
        (subject_type = 'OWNER' AND subject_id IS NULL)
        OR (subject_type IN ('USER', 'DEPARTMENT', 'PROJECT') AND subject_id IS NOT NULL))
    , CONSTRAINT document_grant_level CHECK (level IN ('READ', 'WRITE', 'MANAGE'))
-- [jooq ignore stop]
);
CREATE INDEX ix_document_grant_target ON document_grant (target_type, target_id);
-- [jooq ignore start]
CREATE UNIQUE INDEX ux_document_grant_subject ON document_grant (target_type, target_id, subject_type, ifnull(subject_id, ''));
-- [jooq ignore stop]
