-- A project member's role (cowork-projects 권한, 2026-11-15): a viewer reads the project and comments, an editor
-- also writes its issues and documents, an administrator also keeps its settings and members. Only members see a
-- project and what is in it. Members until now wrote everything, so they become editors; whoever made the project (who
-- added themselves) becomes its administrator. No one else is added: who is not a member stops seeing the project.
ALTER TABLE project_member ADD COLUMN role text NOT NULL DEFAULT 'EDITOR' CHECK (role IN ('VIEWER', 'EDITOR', 'ADMIN'));
-- [jooq ignore start]
UPDATE project_member SET role = 'ADMIN'
WHERE created_by = user_id
   OR user_id = (SELECT p.created_by FROM project p WHERE p.project_id = project_member.project_id);
-- [jooq ignore stop]
