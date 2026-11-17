-- Preserve an explicit off preference across duplicate membership and rejoining.
ALTER TABLE project_favorite ADD COLUMN is_favorite boolean NOT NULL DEFAULT true;
-- [jooq ignore start]
INSERT INTO project_favorite (user_id, project_id, created_at, is_favorite)
SELECT user_id, project_id, created_at, true FROM project_member WHERE true
ON CONFLICT (user_id, project_id) DO NOTHING;
-- [jooq ignore stop]
