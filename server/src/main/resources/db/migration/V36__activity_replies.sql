-- A reply to a comment on a timeline (Linear's threads, one level): the comment it answers, always a comment that answers
-- none (a reply to a reply answers the same comment). A comment without it stands on its own in the timeline.
ALTER TABLE activity_entry ADD COLUMN parent_id uuid;
CREATE INDEX ix_activity_entry_parent ON activity_entry (parent_id);
