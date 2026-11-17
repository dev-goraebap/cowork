-- 문서함's system folders (docs/pending-records.md, 문서함): every meeting's minutes and every submitted weekly report also
-- has a row in document, the same id as its own, its kind MEETING or WEEKLY_REPORT, so 문서함 lists, searches and
-- serves them with the rest. Their own modules keep what they are and write the row as they change; a draft weekly
-- report has none. facet_id is what the system folder narrows them by: a meeting's project, a report's department.
ALTER TABLE document ADD COLUMN facet_id uuid;

INSERT INTO document (document_id, project_id, folder_id, kind, title, body_text, version, created_at, created_by, updated_at,
    updated_by, deleted_at, facet_id)
SELECT meeting_id, project_id, NULL, 'MEETING', title, coalesce(structured_minutes, ''), 0, created_at, created_by, updated_at,
    updated_by, deleted_at, project_id
FROM meeting;

INSERT INTO document (document_id, project_id, folder_id, kind, title, body_text, version, created_at, created_by, updated_at,
    updated_by, deleted_at, facet_id)
SELECT report.report_id, NULL, NULL, 'WEEKLY_REPORT',
    coalesce((SELECT users.name FROM users WHERE users.user_id = report.author_id), '') || ' · '
        || CAST(strftime('%m', report.week_start) AS INTEGER) || '월 ' || CAST(strftime('%d', report.week_start) AS INTEGER)
        || '일 주간보고',
    trim(coalesce(report.this_week, '') || char(10) || coalesce(report.next_week, '') || char(10) || coalesce(report.note, '')),
    0, report.created_at, report.author_id, report.updated_at, report.author_id, NULL, report.department_id
FROM weekly_report report
WHERE report.status <> 'DRAFT';

CREATE INDEX ix_document_kind ON document (kind, updated_at);
