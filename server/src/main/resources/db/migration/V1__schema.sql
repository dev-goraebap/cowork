-- The whole schema in one migration (SQLite). From here on a change is a new version; this file is not edited again.
-- Keys, uniques, foreign keys and checks sit inside each table, since SQLite cannot add them later. The jOOQ model
-- leaves out checks and foreign keys: its H2 replay cannot make a table that names one not made yet.
-- Moments are UTC text of one width, 2026-10-02T03:04:05.678901Z (InstantTextBinding), the form defaults write
-- too, so they compare and sort as text.
-- What the jOOQ DDL parser cannot replay on H2 (partial and expression indexes, and the keys and indexes the
-- PostgreSQL schema kept out of the jOOQ model) sits between [jooq ignore] markers.

-- Tables

CREATE TABLE announcement (
    announcement_id uuid NOT NULL,
    title varchar(200),
    content text,
    author_id uuid NOT NULL,
    status varchar(16) NOT NULL,
    published_at timestamptz,
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    updated_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    updated_by uuid,
    deleted_at timestamptz,
    deleted_by uuid,
    CONSTRAINT announcement_pkey PRIMARY KEY (announcement_id)
-- [jooq ignore start]
    , CONSTRAINT announcement_author_id_employee_employee_id_fk FOREIGN KEY (author_id) REFERENCES employee(employee_id) ON DELETE RESTRICT
-- [jooq ignore stop]
);

CREATE TABLE announcement_read (
    announcement_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    read_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    CONSTRAINT announcement_read_pkey PRIMARY KEY (announcement_id, employee_id)
-- [jooq ignore start]
    , CONSTRAINT announcement_read_announcement_id_announcement_announcement_id_ FOREIGN KEY (announcement_id) REFERENCES announcement(announcement_id) ON DELETE CASCADE
    , CONSTRAINT announcement_read_employee_id_employee_employee_id_fk FOREIGN KEY (employee_id) REFERENCES employee(employee_id) ON DELETE CASCADE
-- [jooq ignore stop]
);

CREATE TABLE annual_leave_balance (
    employee_id uuid NOT NULL,
    hire_date date NOT NULL,
    is_active boolean DEFAULT 1 NOT NULL,
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    updated_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    deleted_at timestamptz,
    created_by uuid,
    updated_by uuid,
    CONSTRAINT annual_leave_balance_pkey PRIMARY KEY (employee_id)
);

CREATE TABLE approval_request (
    request_id uuid NOT NULL,
    requester_id uuid NOT NULL,
    kind varchar(16) NOT NULL,
    status varchar(16) NOT NULL,
    approval_line jsonb,
    rejection_reason text,
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    submitted_at timestamptz,
    decided_at timestamptz,
    cancelled_at timestamptz,
    suggested_line jsonb,
    CONSTRAINT approval_request_pkey PRIMARY KEY (request_id)
-- [jooq ignore start]
    , CONSTRAINT approval_request_requester_id_employee_employee_id_fk FOREIGN KEY (requester_id) REFERENCES employee(employee_id) ON DELETE RESTRICT
-- [jooq ignore stop]
);

CREATE TABLE approval_step (
    step_id uuid NOT NULL,
    request_id uuid NOT NULL,
    approver_id uuid NOT NULL,
    "order" smallint NOT NULL,
    decision_kind varchar(16) NOT NULL,
    comment text,
    reason text,
    decided_at timestamptz NOT NULL,
    CONSTRAINT approval_step_pkey PRIMARY KEY (step_id)
-- [jooq ignore start]
    , CONSTRAINT approval_step_approver_id_employee_employee_id_fk FOREIGN KEY (approver_id) REFERENCES employee(employee_id) ON DELETE RESTRICT
    , CONSTRAINT approval_step_request_id_approval_request_request_id_fk FOREIGN KEY (request_id) REFERENCES approval_request(request_id) ON DELETE CASCADE
-- [jooq ignore stop]
);

CREATE TABLE approval_template (
    approval_template_id uuid NOT NULL,
    department_id uuid NOT NULL,
    category varchar(16) NOT NULL,
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    updated_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamptz,
    CONSTRAINT approval_template_pkey PRIMARY KEY (approval_template_id)
-- [jooq ignore start]
    , CONSTRAINT approval_template_department_id_department_department_id_fk FOREIGN KEY (department_id) REFERENCES department(department_id) ON DELETE CASCADE
-- [jooq ignore stop]
);

CREATE TABLE approval_template_approver (
    approval_template_approver_id uuid NOT NULL,
    approval_template_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    order_no smallint NOT NULL,
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    CONSTRAINT approval_template_approver_pkey PRIMARY KEY (approval_template_approver_id)
-- [jooq ignore start]
    , CONSTRAINT approval_template_approver_approval_template_id_approval_templa FOREIGN KEY (approval_template_id) REFERENCES approval_template(approval_template_id) ON DELETE CASCADE
    , CONSTRAINT approval_template_approver_employee_id_employee_employee_id_fk FOREIGN KEY (employee_id) REFERENCES employee(employee_id) ON DELETE RESTRICT
-- [jooq ignore stop]
);

CREATE TABLE attachment (
    attachment_id uuid NOT NULL,
    blob_id uuid NOT NULL,
    owner_type varchar(32) NOT NULL,
    owner_id uuid NOT NULL,
    name varchar(64),
    "position" integer DEFAULT 0 NOT NULL,
    note text,
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    created_by uuid,
    updated_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    updated_by uuid,
    deleted_at timestamptz,
    CONSTRAINT attachment_pkey PRIMARY KEY (attachment_id)
-- [jooq ignore start]
    , CONSTRAINT attachment_blob_id_blob_blob_id_fk FOREIGN KEY (blob_id) REFERENCES blob(blob_id) ON DELETE RESTRICT
-- [jooq ignore stop]
);

CREATE TABLE bereavement_leave_policy (
    policy_id uuid NOT NULL,
    event_type varchar(32) NOT NULL,
    relation varchar(32) NOT NULL,
    days integer NOT NULL,
    is_paid boolean DEFAULT 1 NOT NULL,
    is_active boolean DEFAULT 1 NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    updated_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    deleted_at timestamptz,
    created_by uuid,
    updated_by uuid,
    CONSTRAINT bereavement_leave_policy_pkey PRIMARY KEY (policy_id)
);

CREATE TABLE blob (
    blob_id uuid NOT NULL,
    storage_key varchar(512) NOT NULL,
    filename varchar(256) NOT NULL,
    content_type varchar(128) NOT NULL,
    byte_size bigint NOT NULL,
    checksum varchar(64),
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    created_by uuid,
    updated_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    updated_by uuid,
    deleted_at timestamptz,
    dominant_color varchar(7),
    width integer,
    height integer,
    CONSTRAINT blob_pkey PRIMARY KEY (blob_id)
-- [jooq ignore start]
    , CONSTRAINT blob_height_check CHECK ((height > 0))
    , CONSTRAINT blob_width_check CHECK ((width > 0))
    , CONSTRAINT ck_blob_dominant_color CHECK ((dominant_color GLOB '#[0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f]'))
-- [jooq ignore stop]
);

CREATE TABLE blob_variant (
    blob_variant_id uuid NOT NULL,
    blob_id uuid NOT NULL,
    variation_digest varchar(64) NOT NULL,
    storage_key varchar(512) NOT NULL,
    content_type varchar(128) NOT NULL,
    byte_size bigint NOT NULL,
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    CONSTRAINT blob_variant_pkey PRIMARY KEY (blob_variant_id)
-- [jooq ignore start]
    , CONSTRAINT blob_variant_blob_id_blob_blob_id_fk FOREIGN KEY (blob_id) REFERENCES blob(blob_id) ON DELETE CASCADE
-- [jooq ignore stop]
);

CREATE TABLE branding_settings (
    id uuid NOT NULL,
    display_name varchar(120) NOT NULL,
    revision bigint DEFAULT 0 NOT NULL,
    updated_at timestamptz NOT NULL,
    CONSTRAINT branding_settings_pkey PRIMARY KEY (id)
-- [jooq ignore start]
    , CONSTRAINT branding_settings_name_not_blank CHECK ((length(trim(display_name)) > 0))
    , CONSTRAINT branding_settings_singleton CHECK ((id = '00000000-0000-0000-0000-000000000001'))
-- [jooq ignore stop]
);

CREATE TABLE calendar_event (
    event_id uuid NOT NULL,
    visibility varchar(16) NOT NULL,
    title varchar(200) NOT NULL,
    body text,
    location varchar(200),
    all_day boolean NOT NULL,
    start_local timestamp NOT NULL,
    end_local timestamp NOT NULL,
    time_zone varchar(64) NOT NULL,
    rrule text,
    recur_until timestamp,
    split_from_event_id uuid,
    organizer_id uuid NOT NULL,
    tag_id uuid,
    external_uid varchar(255),
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL,
    created_by uuid,
    updated_by uuid,
    deleted_at timestamptz,
    CONSTRAINT calendar_event_pkey PRIMARY KEY (event_id)
-- [jooq ignore start]
    , CONSTRAINT calendar_event_organizer_fk FOREIGN KEY (organizer_id) REFERENCES employee(employee_id) ON DELETE RESTRICT
    , CONSTRAINT calendar_event_split_fk FOREIGN KEY (split_from_event_id) REFERENCES calendar_event(event_id) ON DELETE SET NULL
    , CONSTRAINT calendar_event_tag_fk FOREIGN KEY (tag_id) REFERENCES project_tag(tag_id) ON DELETE RESTRICT
    , CONSTRAINT calendar_event_time_check CHECK ((end_local > start_local))
    , CONSTRAINT calendar_event_visibility_check CHECK (visibility IN ('COMPANY', 'PERSONAL'))
-- [jooq ignore stop]
);

CREATE TABLE calendar_event_attendee (
    event_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    required boolean NOT NULL,
    reminder_minutes integer,
    CONSTRAINT calendar_event_attendee_pkey PRIMARY KEY (event_id, employee_id)
-- [jooq ignore start]
    , CONSTRAINT calendar_event_attendee_employee_fk FOREIGN KEY (employee_id) REFERENCES employee(employee_id) ON DELETE CASCADE
    , CONSTRAINT calendar_event_attendee_event_fk FOREIGN KEY (event_id) REFERENCES calendar_event(event_id) ON DELETE CASCADE
    , CONSTRAINT calendar_event_attendee_reminder_check CHECK (((reminder_minutes IS NULL) OR (reminder_minutes >= 0)))
-- [jooq ignore stop]
);

CREATE TABLE calendar_event_exception (
    event_id uuid NOT NULL,
    original_start timestamp NOT NULL,
    kind varchar(16) NOT NULL,
    title varchar(200),
    location varchar(200),
    start_local timestamp,
    end_local timestamp,
    CONSTRAINT calendar_event_exception_pkey PRIMARY KEY (event_id, original_start)
-- [jooq ignore start]
    , CONSTRAINT calendar_event_exception_event_fk FOREIGN KEY (event_id) REFERENCES calendar_event(event_id) ON DELETE CASCADE
    , CONSTRAINT calendar_event_exception_kind_check CHECK (kind IN ('CANCELLED', 'MODIFIED'))
-- [jooq ignore stop]
);

CREATE TABLE calendar_event_reminder_sent (
    event_id uuid NOT NULL,
    occurrence_start timestamp NOT NULL,
    employee_id uuid NOT NULL,
    sent_at timestamptz NOT NULL,
    CONSTRAINT calendar_event_reminder_sent_pkey PRIMARY KEY (event_id, occurrence_start, employee_id)
-- [jooq ignore start]
    , CONSTRAINT calendar_event_reminder_sent_event_fk FOREIGN KEY (event_id) REFERENCES calendar_event(event_id) ON DELETE CASCADE
-- [jooq ignore stop]
);

CREATE TABLE calendar_place (
    place_id uuid NOT NULL,
    name varchar(100) NOT NULL,
    display_order integer NOT NULL,
    created_at timestamptz NOT NULL,
    created_by uuid,
    updated_at timestamptz NOT NULL,
    updated_by uuid,
    CONSTRAINT calendar_place_pkey PRIMARY KEY (place_id)
);

CREATE TABLE cc_recipient (
    cc_recipient_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    CONSTRAINT cc_recipient_pkey PRIMARY KEY (cc_recipient_id)
-- [jooq ignore start]
    , CONSTRAINT cc_recipient_employee_id_employee_employee_id_fk FOREIGN KEY (employee_id) REFERENCES employee(employee_id) ON DELETE CASCADE
-- [jooq ignore stop]
);

CREATE TABLE department (
    department_id uuid NOT NULL,
    name varchar(64) NOT NULL,
    parent_id uuid,
    depth smallint DEFAULT 0 NOT NULL,
    lead_employee_id uuid,
    lead_title varchar(64),
    display_order integer DEFAULT 0 NOT NULL,
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    updated_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    deleted_at timestamptz,
    created_by uuid,
    updated_by uuid,
    responsibilities text,
    CONSTRAINT department_pkey PRIMARY KEY (department_id)
-- [jooq ignore start]
    , CONSTRAINT department_lead_employee_id_employee_employee_id_fk FOREIGN KEY (lead_employee_id) REFERENCES employee(employee_id) ON DELETE SET NULL
-- [jooq ignore stop]
);

CREATE TABLE employee (
    employee_id uuid NOT NULL,
    name varchar(64) NOT NULL,
    work_email varchar(254) NOT NULL,
    department_id uuid,
    position_id uuid,
    hire_date date NOT NULL,
    status varchar(16) NOT NULL,
    personal_phone varchar(32),
    office_phone varchar(32),
    birth_date date,
    address text,
    invited_at timestamptz NOT NULL,
    activated_at timestamptz,
    terminated_at date,
    deleted_at timestamptz,
    created_by uuid,
    updated_by uuid,
    title_id uuid,
    CONSTRAINT employee_pkey PRIMARY KEY (employee_id)
-- [jooq ignore start]
    , CONSTRAINT employee_department_id_department_department_id_fk FOREIGN KEY (department_id) REFERENCES department(department_id) ON DELETE RESTRICT
    , CONSTRAINT employee_position_id_position_position_id_fk FOREIGN KEY (position_id) REFERENCES "position"(position_id) ON DELETE RESTRICT
    , CONSTRAINT employee_title_id_title_title_id_fk FOREIGN KEY (title_id) REFERENCES title(title_id) ON DELETE RESTRICT
-- [jooq ignore stop]
);

CREATE TABLE employee_career (
    id uuid NOT NULL,
    employee_id uuid NOT NULL,
    period_start varchar(7) NOT NULL,
    period_end varchar(7),
    company_name varchar(128) NOT NULL,
    job_role varchar(64),
    "position" varchar(64),
    note text,
    display_order integer DEFAULT 0 NOT NULL,
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    CONSTRAINT employee_career_pkey PRIMARY KEY (id)
-- [jooq ignore start]
    , CONSTRAINT employee_career_employee_id_employee_employee_id_fk FOREIGN KEY (employee_id) REFERENCES employee(employee_id) ON DELETE CASCADE
-- [jooq ignore stop]
);

CREATE TABLE employee_certification (
    id uuid NOT NULL,
    employee_id uuid NOT NULL,
    cert_number varchar(64),
    cert_name varchar(128) NOT NULL,
    score varchar(32),
    acquired_on date,
    note text,
    display_order integer DEFAULT 0 NOT NULL,
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    CONSTRAINT employee_certification_pkey PRIMARY KEY (id)
-- [jooq ignore start]
    , CONSTRAINT employee_certification_employee_id_employee_employee_id_fk FOREIGN KEY (employee_id) REFERENCES employee(employee_id) ON DELETE CASCADE
-- [jooq ignore stop]
);

CREATE TABLE employee_education (
    id uuid NOT NULL,
    employee_id uuid NOT NULL,
    period_start varchar(7) NOT NULL,
    period_end varchar(7),
    school_name varchar(128) NOT NULL,
    graduated boolean DEFAULT 0 NOT NULL,
    note text,
    display_order integer DEFAULT 0 NOT NULL,
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    CONSTRAINT employee_education_pkey PRIMARY KEY (id)
-- [jooq ignore start]
    , CONSTRAINT employee_education_employee_id_employee_employee_id_fk FOREIGN KEY (employee_id) REFERENCES employee(employee_id) ON DELETE CASCADE
-- [jooq ignore stop]
);

CREATE TABLE employee_family (
    id uuid NOT NULL,
    employee_id uuid NOT NULL,
    relation varchar(16) NOT NULL,
    name varchar(64) NOT NULL,
    birth_date date,
    note text,
    display_order integer DEFAULT 0 NOT NULL,
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    CONSTRAINT employee_family_pkey PRIMARY KEY (id)
-- [jooq ignore start]
    , CONSTRAINT employee_family_employee_id_employee_employee_id_fk FOREIGN KEY (employee_id) REFERENCES employee(employee_id) ON DELETE CASCADE
-- [jooq ignore stop]
);

CREATE TABLE employee_profile (
    employee_id uuid NOT NULL,
    employment_type varchar(16) DEFAULT 'FULL_TIME' NOT NULL,
    job_title varchar(64),
    gender varchar(8),
    phone varchar(32),
    personal_email varchar(256),
    address text,
    current_address text,
    hr_memo text,
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    updated_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    pregnancy_expected_due_date date,
    pregnancy_actual_birth_date date,
    avatar_preset smallint,
    avatar_picture_id uuid,
    CONSTRAINT employee_profile_pkey PRIMARY KEY (employee_id)
-- [jooq ignore start]
    , CONSTRAINT employee_profile_employee_id_employee_employee_id_fk FOREIGN KEY (employee_id) REFERENCES employee(employee_id) ON DELETE CASCADE
    , CONSTRAINT employee_profile_avatar_preset_check CHECK (((avatar_preset >= 0) AND (avatar_preset <= 17)))
-- [jooq ignore stop]
);

CREATE TABLE employee_record (
    id uuid NOT NULL,
    employee_id uuid NOT NULL,
    kind varchar(16) NOT NULL,
    occurred_on date NOT NULL,
    content text NOT NULL,
    disposition text,
    note text,
    granted_by uuid,
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    CONSTRAINT employee_record_pkey PRIMARY KEY (id)
-- [jooq ignore start]
    , CONSTRAINT employee_record_employee_id_employee_employee_id_fk FOREIGN KEY (employee_id) REFERENCES employee(employee_id) ON DELETE CASCADE
    , CONSTRAINT employee_record_granted_by_employee_employee_id_fk FOREIGN KEY (granted_by) REFERENCES employee(employee_id) ON DELETE SET NULL
-- [jooq ignore stop]
);

CREATE TABLE employee_training (
    id uuid NOT NULL,
    employee_id uuid NOT NULL,
    training_name varchar(128) NOT NULL,
    period_start varchar(7),
    period_end varchar(7),
    note text,
    display_order integer DEFAULT 0 NOT NULL,
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    CONSTRAINT employee_training_pkey PRIMARY KEY (id)
-- [jooq ignore start]
    , CONSTRAINT employee_training_employee_id_employee_employee_id_fk FOREIGN KEY (employee_id) REFERENCES employee(employee_id) ON DELETE CASCADE
-- [jooq ignore stop]
);

CREATE TABLE holiday (
    date date NOT NULL,
    name varchar(60) NOT NULL,
    is_substitute boolean DEFAULT 0 NOT NULL,
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    updated_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    CONSTRAINT holiday_pkey PRIMARY KEY (date)
);

CREATE TABLE iam_otp (
    user_account_id uuid NOT NULL,
    code_hash varchar(64) NOT NULL,
    issued_at timestamptz NOT NULL,
    expires_at timestamptz NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    consumed boolean DEFAULT 0 NOT NULL,
    CONSTRAINT iam_otp_pkey PRIMARY KEY (user_account_id)
-- [jooq ignore start]
    , CONSTRAINT iam_otp_user_account_id_fkey FOREIGN KEY (user_account_id) REFERENCES user_account(user_account_id)
    , CONSTRAINT iam_otp_attempts_check CHECK ((attempts >= 0))
-- [jooq ignore stop]
);

CREATE TABLE iam_permission_lock (
    id integer NOT NULL,
    CONSTRAINT iam_permission_lock_pkey PRIMARY KEY (id)
);

CREATE TABLE iam_session (
    token_hash varchar(64) NOT NULL,
    user_account_id uuid NOT NULL,
    created_at timestamptz NOT NULL,
    touched_at timestamptz NOT NULL,
    expires_at timestamptz NOT NULL,
    CONSTRAINT iam_session_pkey PRIMARY KEY (token_hash)
-- [jooq ignore start]
    , CONSTRAINT iam_session_user_account_id_fkey FOREIGN KEY (user_account_id) REFERENCES user_account(user_account_id)
-- [jooq ignore stop]
);

CREATE TABLE leave_allowance (
    leave_allowance_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    leave_type_id uuid NOT NULL,
    evidence_key varchar(128),
    is_active boolean DEFAULT 1 NOT NULL,
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    updated_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    deleted_at timestamptz,
    created_by uuid,
    updated_by uuid,
    CONSTRAINT leave_allowance_pkey PRIMARY KEY (leave_allowance_id)
-- [jooq ignore start]
    , CONSTRAINT leave_allowance_employee_id_employee_employee_id_fk FOREIGN KEY (employee_id) REFERENCES employee(employee_id) ON DELETE RESTRICT
    , CONSTRAINT leave_allowance_leave_type_id_leave_type_leave_type_id_fk FOREIGN KEY (leave_type_id) REFERENCES leave_type(leave_type_id) ON DELETE RESTRICT
-- [jooq ignore stop]
);

CREATE TABLE leave_allowance_entry (
    entry_id uuid NOT NULL,
    leave_allowance_id uuid NOT NULL,
    type varchar(16) NOT NULL,
    amount numeric(5,2) NOT NULL,
    expiry_date date,
    evidence_value varchar(256),
    reason text,
    granted_by uuid,
    related_request_id uuid,
    source_grant_entry_id uuid,
    occurred_at timestamptz NOT NULL,
    CONSTRAINT leave_allowance_entry_pkey PRIMARY KEY (entry_id)
-- [jooq ignore start]
    , CONSTRAINT leave_allowance_entry_leave_allowance_id_leave_allowance_leave_ FOREIGN KEY (leave_allowance_id) REFERENCES leave_allowance(leave_allowance_id) ON DELETE RESTRICT
-- [jooq ignore stop]
);

CREATE TABLE leave_allowance_renewal_log (
    log_id uuid NOT NULL,
    leave_type_id uuid NOT NULL,
    period_key varchar(32) NOT NULL,
    granted numeric(6,0) NOT NULL,
    skipped numeric(6,0) NOT NULL,
    executed_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    CONSTRAINT leave_allowance_renewal_log_pkey PRIMARY KEY (log_id)
);

CREATE TABLE leave_ledger_entry (
    entry_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    type varchar(20) NOT NULL,
    amount numeric(6,2) NOT NULL,
    accrual_period varchar(32),
    expiry_date date,
    reason text,
    related_request_id uuid,
    source_accrual_entry_id uuid,
    adjusted_by uuid,
    occurred_at timestamptz NOT NULL,
    CONSTRAINT leave_ledger_entry_pkey PRIMARY KEY (entry_id)
-- [jooq ignore start]
    , CONSTRAINT leave_ledger_entry_employee_id_annual_leave_balance_employee_id FOREIGN KEY (employee_id) REFERENCES annual_leave_balance(employee_id) ON DELETE RESTRICT
-- [jooq ignore stop]
);

CREATE TABLE leave_request_detail (
    request_id uuid NOT NULL,
    leave_type varchar(32) NOT NULL,
    leave_type_id uuid,
    evidence_value varchar(256),
    start_date date NOT NULL,
    end_date date NOT NULL,
    start_time time without time zone,
    end_time time without time zone,
    reason text,
    CONSTRAINT leave_request_detail_pkey PRIMARY KEY (request_id)
-- [jooq ignore start]
    , CONSTRAINT leave_request_detail_leave_type_id_leave_type_leave_type_id_fk FOREIGN KEY (leave_type_id) REFERENCES leave_type(leave_type_id) ON DELETE RESTRICT
    , CONSTRAINT leave_request_detail_request_id_approval_request_request_id_fk FOREIGN KEY (request_id) REFERENCES approval_request(request_id) ON DELETE CASCADE
-- [jooq ignore stop]
);

CREATE TABLE leave_type (
    leave_type_id uuid NOT NULL,
    category varchar(16) NOT NULL,
    kind varchar(16) DEFAULT 'LEAVE' NOT NULL,
    eligibility_gender varchar(8),
    code varchar(64) NOT NULL,
    name varchar(64) NOT NULL,
    description text,
    default_days integer NOT NULL,
    max_days integer,
    max_splits integer,
    requires_reason boolean DEFAULT 0 NOT NULL,
    requires_attachment boolean DEFAULT 0 NOT NULL,
    granted_by varchar(32) NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT 1 NOT NULL,
    expiry_basis varchar(16) DEFAULT 'NONE' NOT NULL,
    expiry_days_after integer,
    event_type varchar(32),
    duration_basis varchar(16) DEFAULT 'WORKING_DAY' NOT NULL,
    renewal_basis varchar(16) DEFAULT 'NONE' NOT NULL,
    renewal_amount integer,
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    updated_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    deleted_at timestamptz,
    created_by uuid,
    updated_by uuid,
    classification varchar(16) NOT NULL,
    CONSTRAINT leave_type_pkey PRIMARY KEY (leave_type_id)
-- [jooq ignore start]
    , CONSTRAINT chk_renewal_basis CHECK (renewal_basis IN ('NONE', 'CALENDAR_YEAR', 'MONTHLY', 'HIRE_ANNIVERSARY'))
-- [jooq ignore stop]
);

CREATE TABLE meeting (
    meeting_id uuid NOT NULL,
    tag_id uuid NOT NULL,
    title text NOT NULL,
    audio_file_name text,
    status text NOT NULL,
    error_message text,
    raw_transcript jsonb,
    structured_minutes text,
    extra_note text,
    referenced_meeting_ids jsonb DEFAULT '[]' NOT NULL,
    deleted_at timestamptz,
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    updated_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    created_by uuid,
    updated_by uuid,
    transcribed_at timestamptz,
    revision_of_meeting_id uuid,
    CONSTRAINT meeting_pkey PRIMARY KEY (meeting_id)
-- [jooq ignore start]
    , CONSTRAINT meeting_revision_of_meeting_id_fkey FOREIGN KEY (revision_of_meeting_id) REFERENCES meeting(meeting_id)
    , CONSTRAINT meeting_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES project_tag(tag_id)
-- [jooq ignore stop]
);

CREATE TABLE meeting_prompt_config (
    key text NOT NULL,
    content text NOT NULL,
    updated_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    updated_by uuid
-- [jooq ignore start]
    , CONSTRAINT meeting_prompt_config_pkey PRIMARY KEY (key)
-- [jooq ignore stop]
);

CREATE TABLE meeting_tag_context (
    tag_id uuid NOT NULL,
    context_template text NOT NULL,
    context_updated_at timestamptz NOT NULL,
    updated_by uuid,
    CONSTRAINT meeting_tag_context_pkey PRIMARY KEY (tag_id)
-- [jooq ignore start]
    , CONSTRAINT meeting_tag_context_tag_fk FOREIGN KEY (tag_id) REFERENCES project_tag(tag_id) ON DELETE CASCADE
-- [jooq ignore stop]
);

CREATE TABLE notification_event (
    event_id uuid NOT NULL,
    kind varchar(64) NOT NULL,
    title varchar(200) NOT NULL,
    message text NOT NULL,
    link varchar(500),
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    actor_id uuid,
    CONSTRAINT notification_event_pkey PRIMARY KEY (event_id)
);

CREATE TABLE notification_recipient (
    event_id uuid NOT NULL,
    recipient_id uuid NOT NULL,
    read_at timestamptz,
    CONSTRAINT notification_recipient_pkey PRIMARY KEY (event_id, recipient_id)
-- [jooq ignore start]
    , CONSTRAINT notification_recipient_event_id_notification_event_event_id_fk FOREIGN KEY (event_id) REFERENCES notification_event(event_id) ON DELETE CASCADE
    , CONSTRAINT notification_recipient_recipient_id_employee_employee_id_fk FOREIGN KEY (recipient_id) REFERENCES employee(employee_id) ON DELETE CASCADE
-- [jooq ignore stop]
);

CREATE TABLE otp_code (
    otp_code_id uuid NOT NULL,
    user_account_id uuid NOT NULL,
    code_hash varchar(128) NOT NULL,
    expires_at timestamptz NOT NULL,
    consumed_at timestamptz,
    revoked_at timestamptz,
    attempts integer DEFAULT 0 NOT NULL,
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    CONSTRAINT otp_code_pkey PRIMARY KEY (otp_code_id)
);

CREATE TABLE overtime_day (
    request_id uuid NOT NULL,
    work_date date NOT NULL,
    employee_id uuid NOT NULL,
    excluded_minutes integer NOT NULL,
    recognized_minutes integer NOT NULL,
    reason text NOT NULL,
    CONSTRAINT overtime_day_pkey PRIMARY KEY (request_id, work_date)
-- [jooq ignore start]
    , CONSTRAINT overtime_day_employee_fk FOREIGN KEY (employee_id) REFERENCES employee(employee_id) ON DELETE RESTRICT
    , CONSTRAINT overtime_day_request_fk FOREIGN KEY (request_id) REFERENCES approval_request(request_id) ON DELETE CASCADE
    , CONSTRAINT overtime_day_minutes_check CHECK (((excluded_minutes >= 0) AND (recognized_minutes > 0)))
-- [jooq ignore stop]
);

CREATE TABLE overtime_segment (
    request_id uuid NOT NULL,
    work_date date NOT NULL,
    seq smallint NOT NULL,
    start_at timestamp NOT NULL,
    end_at timestamp NOT NULL,
    CONSTRAINT overtime_segment_pkey PRIMARY KEY (request_id, work_date, seq)
-- [jooq ignore start]
    , CONSTRAINT overtime_segment_day_fk FOREIGN KEY (request_id, work_date) REFERENCES overtime_day(request_id, work_date) ON DELETE CASCADE
    , CONSTRAINT overtime_segment_order_check CHECK ((end_at > start_at))
-- [jooq ignore stop]
);

CREATE TABLE overtime_tag (
    request_id uuid NOT NULL,
    tag_id uuid NOT NULL,
    CONSTRAINT overtime_tag_pkey PRIMARY KEY (request_id)
-- [jooq ignore start]
    , CONSTRAINT overtime_tag_request_fk FOREIGN KEY (request_id) REFERENCES approval_request(request_id) ON DELETE CASCADE
    , CONSTRAINT overtime_tag_tag_fk FOREIGN KEY (tag_id) REFERENCES project_tag(tag_id) ON DELETE RESTRICT
-- [jooq ignore stop]
);

CREATE TABLE pending_upload (
    pending_upload_id uuid NOT NULL,
    blob_id uuid NOT NULL,
    storage_key varchar(512) NOT NULL,
    owner_type varchar(32) NOT NULL,
    owner_id uuid NOT NULL,
    filename varchar(256) NOT NULL,
    mime_type varchar(128) NOT NULL,
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    created_by uuid,
    updated_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    updated_by uuid,
    dominant_color varchar(7),
    width integer,
    height integer,
    CONSTRAINT pending_upload_pkey PRIMARY KEY (pending_upload_id)
-- [jooq ignore start]
    , CONSTRAINT ck_pending_upload_dominant_color CHECK ((dominant_color GLOB '#[0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f]'))
    , CONSTRAINT pending_upload_height_check CHECK ((height > 0))
    , CONSTRAINT pending_upload_width_check CHECK ((width > 0))
-- [jooq ignore stop]
);

CREATE TABLE position (
    position_id uuid NOT NULL,
    name varchar(32) NOT NULL,
    "order" integer NOT NULL,
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    updated_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    deleted_at timestamptz,
    created_by uuid,
    updated_by uuid,
    career_criteria text,
    CONSTRAINT position_pkey PRIMARY KEY (position_id)
);

CREATE TABLE project_tag (
    tag_id uuid NOT NULL,
    name text NOT NULL,
    color_tone text NOT NULL,
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    updated_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    created_by uuid,
    updated_by uuid,
    display_order integer DEFAULT 0 NOT NULL,
    CONSTRAINT project_tag_pkey PRIMARY KEY (tag_id)
);

CREATE TABLE push_delivery (
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
    CONSTRAINT push_delivery_pkey PRIMARY KEY (delivery_id)
-- [jooq ignore start]
    , CONSTRAINT push_delivery_event_id_fkey FOREIGN KEY (event_id) REFERENCES notification_event(event_id) ON DELETE CASCADE
    , CONSTRAINT push_delivery_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES employee(employee_id) ON DELETE CASCADE
    , CONSTRAINT push_delivery_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES push_subscription(subscription_id) ON DELETE SET NULL
-- [jooq ignore stop]
);

CREATE TABLE push_preference (
    employee_id uuid NOT NULL,
    topic varchar(32) NOT NULL,
    CONSTRAINT push_preference_pkey PRIMARY KEY (employee_id, topic)
-- [jooq ignore start]
    , CONSTRAINT push_preference_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employee(employee_id) ON DELETE CASCADE
-- [jooq ignore stop]
);

CREATE TABLE push_subscription (
    subscription_id uuid NOT NULL,
    user_account_id uuid NOT NULL,
    endpoint text NOT NULL,
    p256dh text NOT NULL,
    auth text NOT NULL,
    user_agent text,
    expired_at timestamptz,
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    last_seen_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    device_name text,
    CONSTRAINT push_subscription_pkey PRIMARY KEY (subscription_id)
-- [jooq ignore start]
    , CONSTRAINT push_subscription_user_account_id_user_account_user_account_id_ FOREIGN KEY (user_account_id) REFERENCES user_account(user_account_id) ON DELETE CASCADE
-- [jooq ignore stop]
);

CREATE TABLE refresh_token (
    refresh_token_id uuid NOT NULL,
    session_id uuid NOT NULL,
    user_account_id uuid NOT NULL,
    token_hash varchar(128) NOT NULL,
    expires_at timestamptz NOT NULL,
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    rotated_to_id uuid,
    revoked_at timestamptz,
    CONSTRAINT refresh_token_pkey PRIMARY KEY (refresh_token_id)
);

CREATE TABLE role (
    role_id uuid NOT NULL,
    name varchar(64) NOT NULL,
    description text,
    permissions jsonb DEFAULT '[]' NOT NULL,
    is_system boolean DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT 1 NOT NULL,
    created_by uuid,
    updated_by uuid,
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    updated_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    deleted_at timestamptz,
    CONSTRAINT role_pkey PRIMARY KEY (role_id)
);

CREATE TABLE role_assignment (
    assignment_id uuid NOT NULL,
    user_account_id uuid NOT NULL,
    role_id uuid NOT NULL,
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    created_by uuid,
    updated_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    updated_by uuid,
    deleted_at timestamptz,
    CONSTRAINT role_assignment_pkey PRIMARY KEY (assignment_id)
-- [jooq ignore start]
    , CONSTRAINT role_assignment_role_id_role_role_id_fk FOREIGN KEY (role_id) REFERENCES role(role_id) ON DELETE RESTRICT
    , CONSTRAINT role_assignment_user_account_id_employee_employee_id_fk FOREIGN KEY (user_account_id) REFERENCES employee(employee_id) ON DELETE CASCADE
-- [jooq ignore stop]
);

CREATE TABLE title (
    title_id uuid NOT NULL,
    name varchar(32) NOT NULL,
    "group" varchar(16) NOT NULL,
    role text,
    scope text,
    decision_authority text,
    "order" integer NOT NULL,
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    updated_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    deleted_at timestamptz,
    created_by uuid,
    updated_by uuid,
    CONSTRAINT title_pkey PRIMARY KEY (title_id)
);

CREATE TABLE user_account (
    user_account_id uuid NOT NULL,
    email varchar(254) NOT NULL,
    is_active boolean DEFAULT 1 NOT NULL,
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    updated_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    deleted_at timestamptz,
    created_by uuid,
    updated_by uuid,
    is_admin boolean DEFAULT 0 NOT NULL,
    CONSTRAINT user_account_pkey PRIMARY KEY (user_account_id)
);

CREATE TABLE work_day_leave_block (
    day_of_week varchar(3) NOT NULL,
    block_type varchar(16) NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    CONSTRAINT work_day_leave_block_day_of_week_block_type_pk PRIMARY KEY (day_of_week, block_type)
-- [jooq ignore start]
    , CONSTRAINT work_day_leave_block_day_of_week_work_schedule_day_day_of_week_ FOREIGN KEY (day_of_week) REFERENCES work_schedule_day(day_of_week)
-- [jooq ignore stop]
);

CREATE TABLE work_schedule_day (
    day_of_week varchar(3) NOT NULL,
    is_working_day boolean NOT NULL,
    start_time time without time zone,
    end_time time without time zone,
    lunch_start time without time zone,
    lunch_end time without time zone,
    updated_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    CONSTRAINT work_schedule_day_pkey PRIMARY KEY (day_of_week)
);

-- Indexes

CREATE INDEX iam_session_expiry ON iam_session (expires_at);

CREATE INDEX iam_session_user ON iam_session (user_account_id);

CREATE INDEX ix_approval_request_created ON approval_request (created_at, request_id);

CREATE INDEX ix_approval_step_approver ON approval_step (approver_id, request_id);

CREATE INDEX ix_calendar_event_attendee_employee ON calendar_event_attendee (employee_id);

CREATE INDEX ix_calendar_event_organizer ON calendar_event (organizer_id);

CREATE INDEX ix_calendar_event_start ON calendar_event (start_local);

CREATE INDEX ix_meeting_created ON meeting (created_at, meeting_id);

CREATE INDEX ix_notification_event_created ON notification_event (created_at, event_id);

CREATE INDEX ix_overtime_day_employee ON overtime_day (employee_id, work_date);

CREATE INDEX ix_overtime_tag_tag ON overtime_tag (tag_id);

CREATE INDEX ix_push_delivery_recipient ON push_delivery (recipient_id, created_at DESC);

CREATE INDEX ix_push_delivery_status ON push_delivery (status, created_at);

-- [jooq ignore start]
CREATE INDEX ix_announcement_by_title ON announcement (status, COALESCE(title, ''), announcement_id) WHERE (deleted_at IS NULL);

CREATE INDEX ix_announcement_drafts ON announcement (updated_at, announcement_id) WHERE (((status) = 'DRAFT') AND (deleted_at IS NULL));

CREATE INDEX ix_announcement_drafts_by_author ON announcement (author_id, updated_at) WHERE (((status) = 'DRAFT') AND (deleted_at IS NULL));

CREATE INDEX ix_announcement_published ON announcement (published_at, announcement_id) WHERE (((status) = 'PUBLISHED') AND (deleted_at IS NULL));

CREATE INDEX ix_announcement_read_employee ON announcement_read (employee_id);

CREATE INDEX ix_attachment_blob ON attachment (blob_id);

CREATE INDEX ix_attachment_owner ON attachment (owner_type, owner_id);

CREATE INDEX ix_blob_checksum ON blob (checksum);

CREATE INDEX ix_employee_career_owner ON employee_career (employee_id, display_order);

CREATE INDEX ix_employee_certification_owner ON employee_certification (employee_id, display_order);

CREATE INDEX ix_employee_education_owner ON employee_education (employee_id, display_order);

CREATE INDEX ix_employee_family_owner ON employee_family (employee_id, display_order);

CREATE INDEX ix_employee_record_owner ON employee_record (employee_id, occurred_on);

CREATE INDEX ix_employee_training_owner ON employee_training (employee_id, display_order);

CREATE INDEX ix_leave_allowance_employee ON leave_allowance (employee_id);

CREATE INDEX ix_leave_allowance_entry_by_allowance ON leave_allowance_entry (leave_allowance_id, occurred_at);

CREATE INDEX ix_notification_event_kind_created ON notification_event (kind, created_at);

CREATE INDEX ix_notification_recipient_by_recipient ON notification_recipient (recipient_id, event_id);

CREATE INDEX ix_notification_recipient_unread ON notification_recipient (recipient_id) WHERE (read_at IS NULL);

CREATE INDEX ix_otp_code_user ON otp_code (user_account_id, created_at);

CREATE INDEX ix_push_subscription_user ON push_subscription (user_account_id, expired_at);

CREATE INDEX meeting_revision_of_meeting_id_idx ON meeting (revision_of_meeting_id);

CREATE INDEX meeting_status_created_at_idx ON meeting (status, created_at);

CREATE INDEX meeting_tag_id_idx ON meeting (tag_id);

CREATE INDEX pending_upload_created_at_idx ON pending_upload (created_at);

CREATE UNIQUE INDEX ux_approval_template_approver_employee ON approval_template_approver (approval_template_id, employee_id);

CREATE UNIQUE INDEX ux_approval_template_approver_order ON approval_template_approver (approval_template_id, order_no);

CREATE UNIQUE INDEX ux_approval_template_dept_category ON approval_template (department_id, category) WHERE (deleted_at IS NULL);

CREATE UNIQUE INDEX ux_bereavement_active ON bereavement_leave_policy (event_type, relation) WHERE (deleted_at IS NULL);

CREATE UNIQUE INDEX ux_blob_variant_blob_digest ON blob_variant (blob_id, variation_digest);

CREATE UNIQUE INDEX ux_calendar_event_external_uid ON calendar_event (external_uid) WHERE ((external_uid IS NOT NULL) AND (deleted_at IS NULL));

CREATE UNIQUE INDEX ux_cc_recipient_employee_id ON cc_recipient (employee_id);

CREATE UNIQUE INDEX ux_department_parent_name ON department (coalesce(parent_id, ''), name) WHERE (deleted_at IS NULL);

CREATE UNIQUE INDEX ux_employee_work_email_active ON employee (work_email) WHERE status IN ('ACTIVE', 'INVITED');

CREATE UNIQUE INDEX ux_leave_allowance_key ON leave_allowance (employee_id, leave_type_id, COALESCE(evidence_key, ''));

CREATE UNIQUE INDEX ux_leave_allowance_renewal_log ON leave_allowance_renewal_log (leave_type_id, period_key);

CREATE UNIQUE INDEX ux_leave_ledger_accrual_period ON leave_ledger_entry (employee_id, accrual_period) WHERE ((type) = 'ACCRUAL');

CREATE UNIQUE INDEX ux_leave_type_code ON leave_type (code) WHERE (deleted_at IS NULL);

CREATE UNIQUE INDEX ux_position_name ON "position" (name) WHERE (deleted_at IS NULL);

CREATE UNIQUE INDEX ux_position_order ON "position" ("order") WHERE (deleted_at IS NULL);

CREATE UNIQUE INDEX ux_push_subscription_endpoint ON push_subscription (endpoint);

CREATE UNIQUE INDEX ux_refresh_token_token_hash ON refresh_token (token_hash);

CREATE UNIQUE INDEX ux_role_assignment_active_pair ON role_assignment (user_account_id, role_id) WHERE (deleted_at IS NULL);

CREATE UNIQUE INDEX ux_role_name_lower ON role (lower((name))) WHERE (deleted_at IS NULL);

CREATE UNIQUE INDEX ux_title_name ON title (name) WHERE (deleted_at IS NULL);

CREATE UNIQUE INDEX ux_title_order ON title ("order") WHERE (deleted_at IS NULL);

CREATE UNIQUE INDEX ux_user_account_email ON user_account (email);
-- [jooq ignore stop]

-- Seed
INSERT INTO iam_permission_lock VALUES (1);
