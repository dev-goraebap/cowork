-- Stage three of the projects area: documents, on BIT's 문서함. A document lives in a space,
-- a project's (project_id) or the area's shared one (공용, project_id null), at the space's top or in one of its
-- folders; folders nest within their space. A document's body is written in the shared body editor and kept in the
-- rich_body tables (owner type PROJECT_DOCUMENT), its files under the same owner; the document keeps a plain-text copy
-- of it to search. Deleted folders and documents stay as rows, out of every list.

-- A folder of a space, under another folder of the same space or at its top. Its name is unique among its live
-- neighbours whatever its case, and has no slash, so a path of names finds one folder.
CREATE TABLE document_folder (
    folder_id uuid NOT NULL,
    project_id uuid,
    parent_id uuid,
    name varchar(100) NOT NULL,
    version bigint DEFAULT 0 NOT NULL,
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    created_by uuid,
    updated_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    updated_by uuid,
    deleted_at timestamptz,
    deleted_by uuid,
    CONSTRAINT document_folder_pkey PRIMARY KEY (folder_id)
-- [jooq ignore start]
    , CONSTRAINT document_folder_project_fkey FOREIGN KEY (project_id) REFERENCES project (project_id) ON DELETE CASCADE
    , CONSTRAINT document_folder_parent_fkey FOREIGN KEY (parent_id) REFERENCES document_folder (folder_id) ON DELETE CASCADE
    , CONSTRAINT document_folder_name CHECK (length(trim(name)) > 0 AND instr(name, '/') = 0)
-- [jooq ignore stop]
);
CREATE INDEX ix_document_folder_space ON document_folder (project_id, parent_id);
-- [jooq ignore start]
CREATE UNIQUE INDEX ux_document_folder_name ON document_folder (ifnull(project_id, ''), ifnull(parent_id, ''), lower(name))
    WHERE deleted_at IS NULL;
-- [jooq ignore stop]

-- A document: its space and folder (none, the space's top), title, the plain text of its body as last saved (for
-- search and the lists' excerpt), and its version for optimistic locking of the title and the place; the body has its
-- own (rich_body.version). updated_at moves with the body too, so the lists' 최근 변경 says when it was last written.
CREATE TABLE document (
    document_id uuid NOT NULL,
    project_id uuid,
    folder_id uuid,
    title varchar(200) NOT NULL,
    body_text text DEFAULT '' NOT NULL,
    version bigint DEFAULT 0 NOT NULL,
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    created_by uuid,
    updated_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    updated_by uuid,
    deleted_at timestamptz,
    deleted_by uuid,
    CONSTRAINT document_pkey PRIMARY KEY (document_id)
-- [jooq ignore start]
    , CONSTRAINT document_project_fkey FOREIGN KEY (project_id) REFERENCES project (project_id) ON DELETE CASCADE
    , CONSTRAINT document_folder_fkey FOREIGN KEY (folder_id) REFERENCES document_folder (folder_id) ON DELETE SET NULL
    , CONSTRAINT document_title CHECK (length(trim(title)) > 0)
-- [jooq ignore stop]
);
CREATE INDEX ix_document_space ON document (project_id, folder_id);
CREATE INDEX ix_document_updated ON document (updated_at, document_id);
CREATE INDEX ix_document_created ON document (created_at, document_id);
