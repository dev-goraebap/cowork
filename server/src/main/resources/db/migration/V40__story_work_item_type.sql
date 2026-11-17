-- Add a story without changing existing feature issues, the default type or custom types.
-- A user-created story keeps its own code and settings.
-- [jooq ignore start]
INSERT INTO work_item_type (code, name, icon, color, "position", is_default)
SELECT 'STORY', '스토리', 'document', '#4cb782', coalesce(max("position"), -1) + 1, false
FROM work_item_type
HAVING NOT EXISTS (
    SELECT 1 FROM work_item_type WHERE code = 'STORY' OR lower(name) IN ('스토리', 'story')
);
-- [jooq ignore stop]
