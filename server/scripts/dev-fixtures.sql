-- Run explicitly against the local development database only, after Flyway migrations.
-- Synthetic examples; never run in QA or production.
BEGIN;
INSERT INTO user_account (user_account_id, email, is_admin) VALUES
('00000000-0000-0000-0000-000000000101', 'admin@example.test', TRUE),
('00000000-0000-0000-0000-000000000102', 'member@example.test', FALSE)
ON CONFLICT (user_account_id) DO NOTHING;
INSERT INTO employee (employee_id, name, work_email, status, hire_date, invited_at) VALUES
('00000000-0000-0000-0000-000000000101', '개발 관리자', 'admin@example.test', 'ACTIVE', CURRENT_DATE, CURRENT_TIMESTAMP),
('00000000-0000-0000-0000-000000000102', '개발 구성원', 'member@example.test', 'ACTIVE', CURRENT_DATE, CURRENT_TIMESTAMP)
ON CONFLICT (employee_id) DO NOTHING;
COMMIT;
