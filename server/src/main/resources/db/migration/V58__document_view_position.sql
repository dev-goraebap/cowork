-- 문서 뷰의 순서: 업무 뷰처럼 순서 편집으로 정한다. 지금까지는 이름순이었으므로 그 순서로 채운다.
ALTER TABLE document_view ADD COLUMN position integer NOT NULL DEFAULT 0;
UPDATE document_view SET position = (
  SELECT COUNT(*) FROM document_view other
  WHERE other.project_id = document_view.project_id
    AND (other.name < document_view.name OR (other.name = document_view.name AND other.view_id < document_view.view_id))
);
