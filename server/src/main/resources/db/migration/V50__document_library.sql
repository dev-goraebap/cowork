-- Documents, saved queries and ordered reading collections have separate identities.
CREATE TABLE document_label (
 label_id uuid PRIMARY KEY, project_id uuid NOT NULL, name varchar(200) NOT NULL,
 CONSTRAINT document_label_name UNIQUE(project_id, name)
-- [jooq ignore start]
 , FOREIGN KEY(project_id) REFERENCES project(project_id)
-- [jooq ignore stop]
);
CREATE TABLE document_label_link (
 document_id uuid NOT NULL, label_id uuid NOT NULL, PRIMARY KEY(document_id, label_id)
-- [jooq ignore start]
 , FOREIGN KEY(document_id) REFERENCES document(document_id), FOREIGN KEY(label_id) REFERENCES document_label(label_id)
-- [jooq ignore stop]
);
CREATE TABLE document_view (
 view_id uuid PRIMARY KEY, project_id uuid NOT NULL, name varchar(200) NOT NULL,
 label_ids text NOT NULL DEFAULT '[]', query text NOT NULL DEFAULT '',
 layout varchar(16) NOT NULL DEFAULT 'LIST', sort varchar(16) NOT NULL DEFAULT 'CUSTOM',
 version bigint NOT NULL DEFAULT 0
-- [jooq ignore start]
 , FOREIGN KEY(project_id) REFERENCES project(project_id)
 , CHECK(layout IN ('LIST','GRID')), CHECK(sort IN ('CUSTOM','TITLE','UPDATED','CREATED'))
-- [jooq ignore stop]
);
CREATE TABLE document_collection (
 collection_id uuid PRIMARY KEY, project_id uuid NOT NULL, name varchar(200) NOT NULL,
 version bigint NOT NULL DEFAULT 0
-- [jooq ignore start]
 , FOREIGN KEY(project_id) REFERENCES project(project_id)
-- [jooq ignore stop]
);
CREATE TABLE document_outline_item (
 item_id uuid PRIMARY KEY, collection_id uuid NOT NULL, parent_id uuid, position integer NOT NULL,
 title varchar(200), document_id uuid
-- [jooq ignore start]
 , FOREIGN KEY(collection_id) REFERENCES document_collection(collection_id) ON DELETE CASCADE
 , FOREIGN KEY(document_id) REFERENCES document(document_id)
 , CHECK((document_id IS NULL AND length(trim(title)) > 0) OR (document_id IS NOT NULL AND title IS NULL))
-- [jooq ignore stop]
);
CREATE INDEX ix_document_outline_collection ON document_outline_item(collection_id, parent_id, position);
CREATE TABLE document_library_order (
 project_id uuid PRIMARY KEY, ids text NOT NULL DEFAULT '[]', version bigint NOT NULL DEFAULT 0
-- [jooq ignore start]
 , FOREIGN KEY(project_id) REFERENCES project(project_id)
-- [jooq ignore stop]
);

-- Keep legacy folders solely as immutable access ancestry, never as user-visible containers.
-- This preserves dynamic department/project grants, including intersections of ancestor grants.
-- Copy folder paths to labels so names that existed in different branches stay distinct.
-- [jooq ignore start]
WITH RECURSIVE paths(id, project_id, path) AS (
 SELECT folder_id, project_id, name FROM document_folder WHERE parent_id IS NULL
 UNION ALL
 SELECT f.folder_id, f.project_id, paths.path || ' / ' || f.name FROM document_folder f JOIN paths ON f.parent_id=paths.id
)
INSERT INTO document_label(label_id,project_id,name)
 SELECT id, project_id, path FROM paths WHERE project_id IS NOT NULL;
INSERT INTO document_label_link(document_id,label_id)
 SELECT d.document_id,d.folder_id FROM document d JOIN document_label l ON l.label_id=d.folder_id WHERE d.kind IN ('PAGE','MANUAL');

-- The old manual becomes a collection; its cover and chapters become ordinary documents.
-- Chapter ids, body/revision ids and activity ids remain stable.
INSERT INTO document_collection(collection_id,project_id,name)
 SELECT document_id,project_id,title FROM document WHERE kind='MANUAL' AND project_id IS NOT NULL AND deleted_at IS NULL;
INSERT INTO document_outline_item(item_id,collection_id,parent_id,position,document_id)
 SELECT collection_id,collection_id,NULL,-1,collection_id FROM document_collection;
INSERT INTO document(document_id,project_id,folder_id,title,body_text,version,created_at,created_by,updated_at,updated_by,deleted_at,deleted_by,kind)
 SELECT c.chapter_id,d.project_id,d.folder_id,c.title,c.body_text,c.version,c.created_at,c.created_by,c.updated_at,c.updated_by,
 coalesce(c.deleted_at,d.deleted_at),coalesce(c.deleted_by,d.deleted_by),'PAGE'
 FROM manual_chapter c JOIN document d ON d.document_id=c.document_id WHERE d.project_id IS NOT NULL;
INSERT INTO document_outline_item(item_id,collection_id,parent_id,position,document_id)
 SELECT c.chapter_id,c.document_id,c.parent_id,c.position,c.chapter_id FROM manual_chapter c JOIN document_collection m ON m.collection_id=c.document_id WHERE c.deleted_at IS NULL;
INSERT INTO document_label_link(document_id,label_id)
 SELECT c.chapter_id,l.label_id FROM manual_chapter c JOIN document_label_link l ON l.document_id=c.document_id JOIN document d ON d.document_id=c.chapter_id;
-- OWNER on the old manual still means that manual's author, not a chapter's author.
INSERT INTO document_grant(grant_id,target_type,target_id,subject_type,subject_id,level,created_at,created_by)
 SELECT lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-8' || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))),'DOCUMENT',c.chapter_id,
 CASE WHEN g.subject_type='OWNER' THEN 'USER' ELSE g.subject_type END,
 CASE WHEN g.subject_type='OWNER' THEN d.created_by ELSE g.subject_id END,g.level,g.created_at,g.created_by
 FROM manual_chapter c JOIN document d ON d.document_id=c.document_id JOIN document_grant g ON g.target_type='DOCUMENT' AND g.target_id=d.document_id
 WHERE d.project_id IS NOT NULL AND (g.subject_type<>'OWNER' OR d.created_by IS NOT NULL);
UPDATE rich_body SET owner_type='PROJECT_DOCUMENT' WHERE owner_type='MANUAL_CHAPTER' AND owner_id IN (SELECT document_id FROM document);
UPDATE activity_entry SET owner_type='PROJECT_DOCUMENT' WHERE owner_type='MANUAL_CHAPTER' AND owner_id IN (SELECT document_id FROM document);
UPDATE attachment SET owner_type='PROJECT_DOCUMENT' WHERE owner_type='MANUAL_CHAPTER' AND owner_id IN (SELECT document_id FROM document);
UPDATE document_editing SET owner_type='PROJECT_DOCUMENT' WHERE owner_type='MANUAL_CHAPTER' AND owner_id IN (SELECT document_id FROM document);
UPDATE document SET kind='PAGE' WHERE kind='MANUAL' AND project_id IS NOT NULL;

-- User decision: remove shared documents, do not transfer them to a project.
-- Soft deletion keeps history for recovery; no shared writes will be accepted.
UPDATE document SET deleted_at=coalesce(deleted_at,strftime('%Y-%m-%dT%H:%M:%S','now') || substr(strftime('%f','now'),3) || '000Z')
 WHERE project_id IS NULL AND kind IN ('PAGE','MANUAL');
-- [jooq ignore stop]
