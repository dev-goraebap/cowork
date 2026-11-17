-- Weekly reports. One report per author and week (week_start is the Monday, Seoul). seq numbers an author's submitted
-- reports from 1 and stays empty on a draft; department_id is where the author was when last saved, so whoever led
-- that department and the ones above sees it. deadline_at is the deadline as it stood when submitted, so a report
-- stays late or on time however leave changes afterwards.
CREATE TABLE weekly_report (
    report_id uuid NOT NULL,
    author_id uuid NOT NULL,
    week_start date NOT NULL,
    seq integer,
    department_id uuid,
    this_week text,
    next_week text,
    note text,
    status varchar(16) NOT NULL,
    deadline_at timestamptz,
    submitted_at timestamptz,
    confirmed_by uuid,
    confirmed_at timestamptz,
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    updated_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    CONSTRAINT weekly_report_pkey PRIMARY KEY (report_id),
    CONSTRAINT weekly_report_author_week_uk UNIQUE (author_id, week_start),
    CONSTRAINT weekly_report_author_seq_uk UNIQUE (author_id, seq)
-- [jooq ignore start]
    , CONSTRAINT weekly_report_author_fk FOREIGN KEY (author_id) REFERENCES employee(employee_id) ON DELETE CASCADE
    , CONSTRAINT weekly_report_status_ck CHECK (status IN ('DRAFT', 'SUBMITTED', 'CONFIRMED'))
-- [jooq ignore stop]
);

CREATE INDEX ix_weekly_report_week ON weekly_report (week_start, author_id);

-- Who has to write weekly reports, by weeks: from from_week, through until_week when they were taken off. Earlier
-- weeks keep showing who had to write then.
CREATE TABLE weekly_report_target (
    target_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    from_week date NOT NULL,
    until_week date,
    CONSTRAINT weekly_report_target_pkey PRIMARY KEY (target_id)
-- [jooq ignore start]
    , CONSTRAINT weekly_report_target_employee_fk FOREIGN KEY (employee_id) REFERENCES employee(employee_id) ON DELETE CASCADE
-- [jooq ignore stop]
);

CREATE INDEX ix_weekly_report_target_employee ON weekly_report_target (employee_id, from_week);

-- Who sees every weekly report, such as the PM, whatever their department.
CREATE TABLE weekly_report_viewer (
    employee_id uuid NOT NULL,
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    created_by uuid,
    CONSTRAINT weekly_report_viewer_pkey PRIMARY KEY (employee_id)
-- [jooq ignore start]
    , CONSTRAINT weekly_report_viewer_employee_fk FOREIGN KEY (employee_id) REFERENCES employee(employee_id) ON DELETE CASCADE
-- [jooq ignore stop]
);

-- The deadline reminders sent, one of each kind (DUE on the deadline day, MISSING the next working day) per author
-- and week.
CREATE TABLE weekly_report_reminder (
    employee_id uuid NOT NULL,
    week_start date NOT NULL,
    kind varchar(16) NOT NULL,
    sent_at timestamptz NOT NULL,
    CONSTRAINT weekly_report_reminder_pkey PRIMARY KEY (employee_id, week_start, kind)
);
