-- 업무를 처음 진행 중으로 옮긴 시각. 계획(시작일~기한)과 실제(진행 시작~완료 시각)를 견주는 데 쓴다.
-- 지금까지의 업무는 그 시각을 따로 남기지 않았으므로 비워 둔다.
ALTER TABLE issue ADD COLUMN started_at timestamptz;
