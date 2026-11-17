-- Document labels are a workspace dictionary, separate from work-item labels.
CREATE TABLE document_label_new (
 label_id uuid PRIMARY KEY, name varchar(200) NOT NULL, color varchar(7) NOT NULL,
 position integer NOT NULL DEFAULT 0, version bigint NOT NULL DEFAULT 0
);
CREATE TABLE document_label_link_new (
 document_id uuid NOT NULL, label_id uuid NOT NULL, PRIMARY KEY(document_id,label_id)
-- [jooq ignore start]
 , FOREIGN KEY(document_id) REFERENCES document(document_id), FOREIGN KEY(label_id) REFERENCES document_label_new(label_id)
-- [jooq ignore stop]
);
-- [jooq ignore start]
CREATE UNIQUE INDEX ux_document_label_new_name ON document_label_new(lower(name));
CREATE TEMP TABLE document_label_parts(old_id text NOT NULL,name text NOT NULL,candidate text NOT NULL);
WITH RECURSIVE parts(old_id,name,rest) AS (
 SELECT l.label_id,'',replace(l.name,' / ','/') || '/' FROM document_label l
 WHERE NOT EXISTS(SELECT 1 FROM document_folder f WHERE f.folder_id=l.label_id)
 OR EXISTS(SELECT 1 FROM document_label_link x JOIN document d ON d.document_id=x.document_id WHERE x.label_id=l.label_id AND d.deleted_at IS NULL)
 UNION ALL
 SELECT old_id,trim(substr(rest,1,instr(rest,'/')-1)),substr(rest,instr(rest,'/')+1) FROM parts WHERE rest<>''
)
INSERT INTO document_label_parts
 SELECT old_id,name,lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-8' || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))) FROM parts WHERE name<>'';
CREATE TEMP TABLE document_label_map(old_id text NOT NULL,new_id text NOT NULL);
INSERT INTO document_label_new(label_id,name,color,position)
 SELECT min(candidate),min(name),CASE (row_number() OVER(ORDER BY lower(name))-1)%8
 WHEN 0 THEN '#4a90e2' WHEN 1 THEN '#4cb782' WHEN 2 THEN '#f2994a' WHEN 3 THEN '#bb87fc'
 WHEN 4 THEN '#f06595' WHEN 5 THEN '#20b2a0' WHEN 6 THEN '#f2c94c' ELSE '#eb5757' END,
 row_number() OVER(ORDER BY lower(name))-1 FROM document_label_parts GROUP BY lower(name);
INSERT INTO document_label_map SELECT DISTINCT p.old_id,l.label_id FROM document_label_parts p JOIN document_label_new l ON lower(l.name)=lower(p.name);
INSERT OR IGNORE INTO document_label_link_new SELECT x.document_id,m.new_id FROM document_label_link x JOIN document_label_map m ON m.old_id=x.label_id;
UPDATE document_view SET label_ids=(SELECT json_group_array(new_id) FROM (SELECT DISTINCT m.new_id FROM json_each(document_view.label_ids) j JOIN document_label_map m ON m.old_id=j.value)),version=version+1;
-- [jooq ignore stop]
DROP TABLE document_label_link;
DROP TABLE document_label;
-- [jooq ignore start]
DROP TABLE document_label_map;
DROP TABLE document_label_parts;
-- [jooq ignore stop]
ALTER TABLE document_label_new RENAME TO document_label;
ALTER TABLE document_label_link_new RENAME TO document_label_link;
