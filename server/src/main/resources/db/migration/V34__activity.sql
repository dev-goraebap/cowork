-- What happened to anything with a body and the discussion under it, in one timeline (DESIGN.md 상세 페이지; 결정기록
-- 2026-11-04 공통 활동): for an owner of another module, by the same type and id its rich body has (PROJECT_ISSUE,
-- PROJECT_DOCUMENT, MANUAL_CHAPTER). An EVENT is a change (field, the value before and after as the timeline shows
-- them); a COMMENT is plain text, perhaps quoting the words of the body it was written on, edited or deleted by its
-- writer (deleted kept for the record). The owner checks who may read and write.
CREATE TABLE activity_entry (
    entry_id uuid NOT NULL,
    owner_type varchar(32) NOT NULL,
    owner_id uuid NOT NULL,
    kind varchar(16) NOT NULL,
    field varchar(32),
    before_value varchar(400),
    after_value varchar(400),
    body text,
    quote text,
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    created_by uuid,
    edited_at timestamptz,
    deleted_at timestamptz,
    CONSTRAINT activity_entry_pkey PRIMARY KEY (entry_id)
);
CREATE INDEX ix_activity_entry_owner ON activity_entry (owner_id, created_at);

-- [jooq ignore start]
-- An issue's own activity and comments move into it.
INSERT INTO activity_entry (entry_id, owner_type, owner_id, kind, field, before_value, after_value, created_at, created_by)
SELECT activity_id, 'PROJECT_ISSUE', issue_id, 'EVENT', field, before_value, after_value, created_at, created_by
FROM issue_activity;

INSERT INTO activity_entry (entry_id, owner_type, owner_id, kind, body, created_at, created_by, edited_at, deleted_at)
SELECT comment_id, 'PROJECT_ISSUE', issue_id, 'COMMENT', body, created_at, created_by, edited_at, deleted_at
FROM issue_comment;
-- [jooq ignore stop]

DROP TABLE issue_activity;
DROP TABLE issue_comment;
