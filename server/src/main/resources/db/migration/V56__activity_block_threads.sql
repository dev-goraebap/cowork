-- 댓글을 본문의 블록에 단다(2026-11-11 사용자 결정, 결정기록 2026-11-04 공통 활동을 넓힌다). 댓글은 그대로 활동 기록 한 곳에 있고,
-- 스레드 첫 댓글이 그 블록(rich_block.block_id, 맨 바깥 블록)과 해결 여부를 가진다. 답글은 첫 댓글을 따른다.
-- block_id가 없으면 위치 없는 댓글이다. 블록이 지워지면 활동 기록에만 남는다(quote에 블록 글 앞부분을 둔다).
ALTER TABLE activity_entry ADD COLUMN block_id varchar(64);
ALTER TABLE activity_entry ADD COLUMN resolved_at timestamptz;
ALTER TABLE activity_entry ADD COLUMN resolved_by uuid;
CREATE INDEX ix_activity_entry_block ON activity_entry (owner_id, block_id);
