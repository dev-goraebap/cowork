-- 문서함's first stage (docs/pending-records.md, 2026-11-04 문서함): a document is of a kind, a page on its own (PAGE) or a
-- 매뉴얼 (MANUAL) of ordered chapters, and documents and folders carry a mark, an icon name and a #RRGGBB colour, either
-- absent (the kind's own icon in the quiet ink). The documents there are pages.
ALTER TABLE document ADD COLUMN kind varchar(16) DEFAULT 'PAGE' NOT NULL;
ALTER TABLE document ADD COLUMN icon varchar(64);
ALTER TABLE document ADD COLUMN color varchar(7);
ALTER TABLE document_folder ADD COLUMN icon varchar(64);
ALTER TABLE document_folder ADD COLUMN color varchar(7);

-- A chapter of a 매뉴얼: under the manual's cover (parent_id null) or under another chapter of the same manual, placed
-- among its siblings by position. Its body is kept in the rich_body tables (owner type MANUAL_CHAPTER), its files under
-- the same owner; the chapter keeps a plain-text copy of it to search. A deleted chapter stays as a row, out of every
-- list, with the chapters under it.
CREATE TABLE manual_chapter (
    chapter_id uuid NOT NULL,
    document_id uuid NOT NULL,
    parent_id uuid,
    position integer NOT NULL,
    title varchar(200) NOT NULL,
    body_text text DEFAULT '' NOT NULL,
    version bigint DEFAULT 0 NOT NULL,
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    created_by uuid,
    updated_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    updated_by uuid,
    deleted_at timestamptz,
    deleted_by uuid,
    CONSTRAINT manual_chapter_pkey PRIMARY KEY (chapter_id)
-- [jooq ignore start]
    , CONSTRAINT manual_chapter_document_fkey FOREIGN KEY (document_id) REFERENCES document (document_id) ON DELETE CASCADE
    , CONSTRAINT manual_chapter_parent_fkey FOREIGN KEY (parent_id) REFERENCES manual_chapter (chapter_id) ON DELETE CASCADE
    , CONSTRAINT manual_chapter_title CHECK (length(trim(title)) > 0)
-- [jooq ignore stop]
);
CREATE INDEX ix_manual_chapter_manual ON manual_chapter (document_id, parent_id, position);
