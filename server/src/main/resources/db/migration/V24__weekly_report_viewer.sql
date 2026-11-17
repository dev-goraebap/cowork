-- Some members see every submitted weekly report whatever the organization chart says (DR-i4ci4legf2). Office
-- administrators keep the list; those who see all never confirm a report, as only the direct lead does.
CREATE TABLE weekly_report_viewer (
    employee_id uuid NOT NULL,
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    created_by uuid,
    CONSTRAINT weekly_report_viewer_pkey PRIMARY KEY (employee_id)
-- [jooq ignore start]
    , CONSTRAINT weekly_report_viewer_employee_fk FOREIGN KEY (employee_id) REFERENCES employee(employee_id) ON DELETE CASCADE
-- [jooq ignore stop]
);
