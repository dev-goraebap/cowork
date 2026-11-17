-- The common work item types (작업 유형) every project chooses from, as Redmine keeps its trackers for the whole
-- instance and each project turns some on. Projects administrators add, rename and delete them; the list starts with
-- the fourteen the server used to keep in its code, in their order. Projects keep the names they chose (pj_project.trackers)
-- and work items their type's name (pj_work_item.tracker), so renaming one renames it there too.
CREATE TABLE pj_tracker (
    tracker_id uuid NOT NULL,
    name varchar(50) NOT NULL,
    position integer NOT NULL,
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    CONSTRAINT pj_tracker_pkey PRIMARY KEY (tracker_id)
);

CREATE UNIQUE INDEX ux_pj_tracker_name ON pj_tracker (name);

-- [jooq ignore start]
-- The code generator's simulation cannot take the rows, and needs only the table.
INSERT INTO pj_tracker (tracker_id, name, position) VALUES
    ('9fe88a27-7fbd-49cf-b415-66aef24ead08', '에픽', 1),
    ('41d1e673-d8c8-4179-9674-74dead5ed7e9', '작업단위', 2),
    ('acb93bd6-3b32-4d9d-b7d1-094b0f2a23de', '유저 스토리', 3),
    ('e04ef931-7d36-4b37-a6b4-446d9995baf6', '태스크', 4),
    ('3127e67d-ceae-449a-91e8-15e8438f1349', '구현', 5),
    ('394d75cb-4c0a-49ce-8a1e-5b44abc44108', '버그픽스', 6),
    ('b0617288-3e21-4b23-95e9-bf3357472cd5', '디자인', 7),
    ('4ecb8e41-5b7b-41b5-a6ef-631eb23034d9', '기획', 8),
    ('35ea8f54-1edf-4228-910b-09c2876602ad', '분석', 9),
    ('7231f505-8fce-49ec-b184-14119d0037c9', '설계', 10),
    ('9f802acf-b528-464f-89b4-138f729e4245', '분석 및 설계', 11),
    ('002ddccd-c880-4c14-a2f6-8f9665ffa5c1', '테스트', 12),
    ('972e8008-f412-4161-8d61-41fe78f6744d', '작업지원', 13),
    ('b396481b-10bf-40fc-8964-e41ccb22256b', 'ETC', 14);
-- [jooq ignore stop]
