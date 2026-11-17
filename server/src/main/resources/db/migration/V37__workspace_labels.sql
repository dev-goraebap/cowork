-- Labels are the workspace's, shared by every project (BIT D-009; 결정기록 2026-11-04 프로젝트 관리): one label per name
-- whatever its case. Labels of the same name in several projects become one, the first made keeping its id, colour and
-- place; the issues keep every label they had. SQLite cannot drop a column a key names, so both tables are made again.
CREATE TABLE issue_label_next (
    label_id uuid NOT NULL,
    name varchar(32) NOT NULL,
    color varchar(7) NOT NULL,
    "position" integer NOT NULL,
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    created_by uuid,
    updated_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    updated_by uuid,
    CONSTRAINT issue_label_next_pkey PRIMARY KEY (label_id)
-- [jooq ignore start]
    , CONSTRAINT issue_label_next_color CHECK (color GLOB '#[0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f]')
-- [jooq ignore stop]
);

CREATE TABLE issue_label_link_next (
    issue_id uuid NOT NULL,
    label_id uuid NOT NULL,
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    created_by uuid,
    CONSTRAINT issue_label_link_next_pkey PRIMARY KEY (issue_id, label_id)
-- [jooq ignore start]
    , CONSTRAINT issue_label_link_next_issue_fkey FOREIGN KEY (issue_id) REFERENCES issue (issue_id) ON DELETE CASCADE
    , CONSTRAINT issue_label_link_next_label_fkey FOREIGN KEY (label_id) REFERENCES issue_label_next (label_id) ON DELETE CASCADE
-- [jooq ignore stop]
);

-- [jooq ignore start]
INSERT INTO issue_label_next (label_id, name, color, "position", created_at, created_by, updated_at, updated_by)
SELECT label_id, name, color, row_number() OVER (ORDER BY "position", created_at, label_id) - 1,
    created_at, created_by, updated_at, updated_by
FROM issue_label label
WHERE label_id = (
    SELECT keeper.label_id FROM issue_label keeper WHERE lower(keeper.name) = lower(label.name)
    ORDER BY keeper.created_at, keeper.label_id LIMIT 1);

INSERT OR IGNORE INTO issue_label_link_next (issue_id, label_id, created_at, created_by)
SELECT link.issue_id,
    (SELECT keeper.label_id FROM issue_label keeper WHERE lower(keeper.name) = lower(label.name)
        ORDER BY keeper.created_at, keeper.label_id LIMIT 1),
    link.created_at, link.created_by
FROM issue_label_link link
JOIN issue_label label ON label.label_id = link.label_id;
-- [jooq ignore stop]

DROP TABLE issue_label_link;
DROP TABLE issue_label;
ALTER TABLE issue_label_next RENAME TO issue_label;
ALTER TABLE issue_label_link_next RENAME TO issue_label_link;
CREATE INDEX ix_issue_label_position ON issue_label ("position", label_id);
CREATE INDEX ix_issue_label_link_label ON issue_label_link (label_id, issue_id);
-- [jooq ignore start]
CREATE UNIQUE INDEX ux_issue_label_name ON issue_label (lower(name));
-- [jooq ignore stop]
