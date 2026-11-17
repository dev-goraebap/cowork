-- Reorder the original starter sequence. Keep custom arrangements and the default type.
-- [jooq ignore start]
WITH starter_order AS MATERIALIZED (
    SELECT group_concat(code || ':' || "position", ',') AS codes
    FROM (SELECT code, "position" FROM work_item_type ORDER BY "position", code LIMIT 5)
)
UPDATE work_item_type
SET "position" = CASE code
    WHEN 'EPIC' THEN 0
    WHEN 'STORY' THEN 1
    WHEN 'FEATURE' THEN 2
    WHEN 'TASK' THEN 3
    WHEN 'BUG' THEN 4
END
WHERE (SELECT codes FROM starter_order) = 'TASK:0,BUG:1,FEATURE:2,EPIC:3,STORY:4'
  AND "position" BETWEEN 0 AND 4
  AND code IN ('EPIC', 'STORY', 'FEATURE', 'TASK', 'BUG');
-- [jooq ignore stop]
