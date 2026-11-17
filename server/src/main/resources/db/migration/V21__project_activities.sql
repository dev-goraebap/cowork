-- The 작업 분류 (time entry activities) a project logs time under, chosen from the common five as a JSON array of their
-- names in order, as a Redmine project turns its activities on and off. Every project starts with all five.
ALTER TABLE pj_project ADD COLUMN activities jsonb DEFAULT '["ANALYSIS","DEVELOPMENT","DESIGN","FIX","TEST"]' NOT NULL;
