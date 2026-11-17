CREATE TABLE document_editing (
 owner_type varchar(64) NOT NULL,
 owner_id uuid NOT NULL,
 user_id uuid NOT NULL,
 lease_id uuid NOT NULL,
 started_at timestamptz NOT NULL,
 last_seen_at timestamptz NOT NULL,
 PRIMARY KEY(owner_type,owner_id,user_id,lease_id)
-- [jooq ignore start]
 , FOREIGN KEY(user_id) REFERENCES users(user_id)
-- [jooq ignore stop]
);
CREATE INDEX ix_document_editing_expiry ON document_editing(last_seen_at);
