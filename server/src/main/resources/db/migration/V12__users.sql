-- A person's own facts move from the Teams record to the user module (DR-ctvo5z7mez, DR-xd7dg7sooz): user_account
-- becomes users and takes the name, the status (invited, working, left) with its dates, the gender and the picture,
-- so the modules every space shares (notifications, the town, system status) read people without the Teams record.
-- employee keeps what only Teams needs: department, position, title, hire and birth dates, phones and address. The
-- work e-mail was already kept equal to the sign-in e-mail, so users.email is both. The id is still shared.

ALTER TABLE user_account RENAME TO users;
ALTER TABLE users RENAME COLUMN user_account_id TO user_id;
ALTER TABLE users ADD COLUMN name varchar(64) NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN status varchar(16) NOT NULL DEFAULT 'INVITED';
ALTER TABLE users ADD COLUMN invited_at timestamptz;
ALTER TABLE users ADD COLUMN activated_at timestamptz;
ALTER TABLE users ADD COLUMN terminated_at date;
ALTER TABLE users ADD COLUMN gender varchar(8);
ALTER TABLE users ADD COLUMN avatar_preset smallint CHECK (avatar_preset >= 0 AND avatar_preset <= 17);
ALTER TABLE users ADD COLUMN avatar_picture_id uuid;
-- [jooq ignore start]
DROP INDEX ux_user_account_email;
CREATE UNIQUE INDEX ux_users_email ON users (email);
-- [jooq ignore stop]

-- [jooq ignore start]
-- Everyone registered has an account; one registered before accounts were opened gets one that cannot sign in.
INSERT INTO users (user_id, email, is_active, created_at, updated_at, deleted_at, created_by, updated_by)
SELECT e.employee_id, e.work_email, 0, e.invited_at, e.invited_at, e.deleted_at, e.created_by, e.updated_by
FROM employee e
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.user_id = e.employee_id);

UPDATE users SET
    name = (SELECT e.name FROM employee e WHERE e.employee_id = users.user_id),
    status = (SELECT e.status FROM employee e WHERE e.employee_id = users.user_id),
    invited_at = (SELECT e.invited_at FROM employee e WHERE e.employee_id = users.user_id),
    activated_at = (SELECT e.activated_at FROM employee e WHERE e.employee_id = users.user_id),
    terminated_at = (SELECT e.terminated_at FROM employee e WHERE e.employee_id = users.user_id),
    gender = (SELECT p.gender FROM employee_profile p WHERE p.employee_id = users.user_id),
    avatar_preset = (SELECT p.avatar_preset FROM employee_profile p WHERE p.employee_id = users.user_id),
    avatar_picture_id = (SELECT p.avatar_picture_id FROM employee_profile p WHERE p.employee_id = users.user_id)
WHERE EXISTS (SELECT 1 FROM employee e WHERE e.employee_id = users.user_id);
-- [jooq ignore stop]

-- [jooq ignore start]
DROP INDEX ux_employee_work_email_active;
-- [jooq ignore stop]
ALTER TABLE employee DROP COLUMN name;
ALTER TABLE employee DROP COLUMN work_email;
ALTER TABLE employee DROP COLUMN status;
ALTER TABLE employee DROP COLUMN invited_at;
ALTER TABLE employee DROP COLUMN activated_at;
ALTER TABLE employee DROP COLUMN terminated_at;

-- The profile loses the gender and the picture; its picture check moves with them, so the table is made again.
CREATE TABLE employee_profile_new (
    employee_id uuid NOT NULL,
    employment_type varchar(16) DEFAULT 'FULL_TIME' NOT NULL,
    job_title varchar(64),
    phone varchar(32),
    personal_email varchar(256),
    address text,
    current_address text,
    hr_memo text,
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    updated_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    pregnancy_expected_due_date date,
    pregnancy_actual_birth_date date,
    CONSTRAINT employee_profile_new_pkey PRIMARY KEY (employee_id)
-- [jooq ignore start]
    , CONSTRAINT employee_profile_employee_id_employee_employee_id_fk FOREIGN KEY (employee_id) REFERENCES employee(employee_id) ON DELETE CASCADE
-- [jooq ignore stop]
);
-- [jooq ignore start]
INSERT INTO employee_profile_new (employee_id, employment_type, job_title, phone, personal_email, address, current_address,
    hr_memo, created_at, updated_at, pregnancy_expected_due_date, pregnancy_actual_birth_date)
SELECT employee_id, employment_type, job_title, phone, personal_email, address, current_address,
    hr_memo, created_at, updated_at, pregnancy_expected_due_date, pregnancy_actual_birth_date
FROM employee_profile;
-- [jooq ignore stop]
DROP TABLE employee_profile;
ALTER TABLE employee_profile_new RENAME TO employee_profile;

-- What every space shares points at the person, not at the Teams record: the town's look, push preferences and
-- deliveries, and who a notice went to. Each table is made again, as SQLite cannot change a foreign key in place.
CREATE TABLE town_resident_new (
    user_id uuid NOT NULL,
    appearance text NOT NULL,
    updated_at timestamptz NOT NULL,
    CONSTRAINT town_resident_new_pkey PRIMARY KEY (user_id)
-- [jooq ignore start]
    , CONSTRAINT town_resident_user_fk FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
-- [jooq ignore stop]
);
-- [jooq ignore start]
INSERT INTO town_resident_new (user_id, appearance, updated_at) SELECT employee_id, appearance, updated_at FROM town_resident;
-- [jooq ignore stop]
DROP TABLE town_resident;
ALTER TABLE town_resident_new RENAME TO town_resident;

CREATE TABLE push_preference_new (
    user_id uuid NOT NULL,
    topic varchar(32) NOT NULL,
    CONSTRAINT push_preference_new_pkey PRIMARY KEY (user_id, topic)
-- [jooq ignore start]
    , CONSTRAINT push_preference_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
-- [jooq ignore stop]
);
-- [jooq ignore start]
INSERT INTO push_preference_new (user_id, topic) SELECT employee_id, topic FROM push_preference;
-- [jooq ignore stop]
DROP TABLE push_preference;
ALTER TABLE push_preference_new RENAME TO push_preference;

CREATE TABLE push_delivery_new (
    delivery_id uuid NOT NULL,
    event_id uuid,
    recipient_id uuid NOT NULL,
    subscription_id uuid,
    title varchar(200) NOT NULL,
    link varchar(500),
    status varchar(16) NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    http_status integer,
    error varchar(500),
    created_at timestamptz NOT NULL,
    attempted_at timestamptz,
    CONSTRAINT push_delivery_new_pkey PRIMARY KEY (delivery_id)
-- [jooq ignore start]
    , CONSTRAINT push_delivery_event_id_fkey FOREIGN KEY (event_id) REFERENCES notification_event(event_id) ON DELETE CASCADE
    , CONSTRAINT push_delivery_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES users(user_id) ON DELETE CASCADE
    , CONSTRAINT push_delivery_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES push_subscription(subscription_id) ON DELETE SET NULL
-- [jooq ignore stop]
);
-- [jooq ignore start]
INSERT INTO push_delivery_new SELECT delivery_id, event_id, recipient_id, subscription_id, title, link, status, attempts,
    http_status, error, created_at, attempted_at FROM push_delivery;
-- [jooq ignore stop]
DROP TABLE push_delivery;
ALTER TABLE push_delivery_new RENAME TO push_delivery;
CREATE INDEX ix_push_delivery_recipient ON push_delivery (recipient_id, created_at DESC);
CREATE INDEX ix_push_delivery_status ON push_delivery (status, created_at);

CREATE TABLE notification_recipient_new (
    event_id uuid NOT NULL,
    recipient_id uuid NOT NULL,
    read_at timestamptz,
    CONSTRAINT notification_recipient_new_pkey PRIMARY KEY (event_id, recipient_id)
-- [jooq ignore start]
    , CONSTRAINT notification_recipient_event_id_notification_event_event_id_fk FOREIGN KEY (event_id) REFERENCES notification_event(event_id) ON DELETE CASCADE
    , CONSTRAINT notification_recipient_recipient_id_users_user_id_fk FOREIGN KEY (recipient_id) REFERENCES users(user_id) ON DELETE CASCADE
-- [jooq ignore stop]
);
-- [jooq ignore start]
INSERT INTO notification_recipient_new (event_id, recipient_id, read_at) SELECT event_id, recipient_id, read_at FROM notification_recipient;
-- [jooq ignore stop]
DROP TABLE notification_recipient;
ALTER TABLE notification_recipient_new RENAME TO notification_recipient;
CREATE INDEX ix_notification_recipient_by_recipient ON notification_recipient (recipient_id, event_id);
-- [jooq ignore start]
CREATE INDEX ix_notification_recipient_unread ON notification_recipient (recipient_id) WHERE (read_at IS NULL);
-- [jooq ignore stop]
