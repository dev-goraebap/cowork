-- A page owns its children. Collections are converted into ordinary page trees.
ALTER TABLE document ADD COLUMN parent_id uuid REFERENCES document(document_id);
CREATE INDEX ix_document_parent ON document(parent_id);
ALTER TABLE document_view ADD COLUMN icon varchar(64);
ALTER TABLE document_view ADD COLUMN color varchar(7);
ALTER TABLE document_view DROP COLUMN query;

-- [jooq ignore start]
-- Existing manual covers already use the collection id; new collections need a root page.
INSERT OR IGNORE INTO document(document_id,project_id,kind,title,body_text,version,created_by,updated_by)
 SELECT c.collection_id,c.project_id,'PAGE',c.name,'',0,p.created_by,p.created_by
 FROM document_collection c JOIN project p ON p.project_id=c.project_id;
INSERT OR IGNORE INTO document(document_id,project_id,kind,title,body_text,version,created_by,updated_by)
 SELECT i.item_id,c.project_id,'PAGE',i.title,'',0,p.created_by,p.created_by
 FROM document_outline_item i JOIN document_collection c ON c.collection_id=i.collection_id
 JOIN project p ON p.project_id=c.project_id WHERE i.document_id IS NULL;

CREATE TEMP TABLE page_parent_import AS
 SELECT coalesce(i.document_id,i.item_id) id,
        coalesce(parent.document_id,parent.item_id,c.collection_id) parent_id,
        c.collection_id,i.position,i.item_id
 FROM document_outline_item i JOIN document_collection c ON c.collection_id=i.collection_id
 LEFT JOIN document_outline_item parent ON parent.item_id=i.parent_id
 JOIN document child ON child.document_id=coalesce(i.document_id,i.item_id) AND child.project_id=c.project_id;
-- A formerly reusable reference now has one owner, chosen in stable order.
UPDATE document SET parent_id=(
 SELECT p.parent_id FROM page_parent_import p WHERE p.id=document.document_id AND p.id<>p.parent_id
 ORDER BY p.collection_id,p.position,p.item_id LIMIT 1)
 WHERE document_id IN (SELECT id FROM page_parent_import WHERE id<>parent_id);
-- Conflicting legacy references must never create a cycle. Keep their bodies as root pages.
WITH RECURSIVE ancestors(start,id,path) AS (
 SELECT document_id,parent_id,','||document_id||',' FROM document WHERE parent_id IS NOT NULL
 UNION ALL
 SELECT a.start,d.parent_id,a.path||a.id||',' FROM ancestors a JOIN document d ON d.document_id=a.id
 WHERE a.id IS NOT NULL AND instr(a.path,','||a.id||',')=0
)
UPDATE document SET parent_id=NULL WHERE document_id IN (SELECT start FROM ancestors WHERE id=start);

-- Preserve labels on the owning root; child pages have no independent assignments.
WITH RECURSIVE roots(id,root) AS (
 SELECT document_id,document_id FROM document WHERE parent_id IS NULL
 UNION ALL SELECT d.document_id,r.root FROM document d JOIN roots r ON d.parent_id=r.id
)
INSERT OR IGNORE INTO document_label_link(document_id,label_id)
 SELECT roots.root,l.label_id FROM document_label_link l JOIN roots ON roots.id=l.document_id;
DELETE FROM document_label_link WHERE document_id IN (SELECT document_id FROM document WHERE parent_id IS NOT NULL);

-- Seed a stable pre-order for converted trees, followed by the project's existing custom order.
INSERT INTO document_library_order(project_id,ids,version)
 SELECT project_id,'[]',0 FROM document_collection GROUP BY project_id
 ON CONFLICT(project_id) DO NOTHING;
UPDATE document_library_order SET ids=(
 SELECT json_group_array(id) FROM (
  SELECT id FROM (
   SELECT c.collection_id id,0 kind,c.collection_id tree,-1 position,c.collection_id tie
    FROM document_collection c WHERE c.project_id=document_library_order.project_id
   UNION ALL
   SELECT p.id,1,p.collection_id,p.position,p.item_id FROM page_parent_import p
    JOIN document d ON d.document_id=p.id WHERE d.project_id=document_library_order.project_id
   UNION ALL
   SELECT j.value,2,'',j.key,j.value FROM json_each(document_library_order.ids) j
  ) GROUP BY id ORDER BY min(kind),tree,position,tie
 )) WHERE project_id IN (SELECT project_id FROM document_collection);
DROP TABLE page_parent_import;
-- [jooq ignore stop]
DROP TABLE document_outline_item;
DROP TABLE document_collection;
