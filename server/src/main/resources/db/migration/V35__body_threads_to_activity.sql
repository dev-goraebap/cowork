-- A body's comment threads anchored in it become comments on its owner's timeline (결정기록 2026-11-04 공통 활동): each
-- message a comment quoting the words its thread was written on, by the same writer at the same moment. Where a thread
-- pointed, and whether it was resolved, is not kept. The anchors and comment sequence columns stay, emptied: SQLite keeps
-- a column a CHECK names (rich_body_json).

-- [jooq ignore start]
INSERT INTO activity_entry (entry_id, owner_type, owner_id, kind, body, quote, created_at, created_by)
SELECT message.message_id, body.owner_type, thread.owner_id, 'COMMENT', message.body,
    nullif(substr(trim(coalesce(json_extract(thread.anchor, '$.quote'), '')), 1, 2000), ''),
    message.created_at, message.created_by
FROM rich_body_message message
JOIN rich_body_thread thread ON thread.thread_id = message.thread_id
JOIN rich_body body ON body.owner_id = thread.owner_id;

UPDATE rich_body SET anchors = '{}', comment_seq = 0;
UPDATE rich_body_revision SET anchors = '{}', comment_seq = 0;
-- [jooq ignore stop]

DROP TABLE rich_body_resolution;
DROP TABLE rich_body_message;
DROP TABLE rich_body_thread;
