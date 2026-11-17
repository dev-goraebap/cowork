-- The board reads one status column of a project a slice at a time (GET /projects/{key}/work-items/column) and counts
-- it. This index narrows to the project's column and, for DONE and REJECTED, already holds their order (latest closed
-- first, then the highest number, then the id), so a slice is read from it without sorting the column. Open columns
-- (NEW, PROGRESS, FEEDBACK) run by the priority's rank, a CASE over the priority, and the due day with none last; an
-- index cannot hold that order, so they are narrowed here and the column's own rows are sorted.
CREATE INDEX pj_work_item_board_idx ON pj_work_item (project_id, status, closed_on, number, work_item_id);
