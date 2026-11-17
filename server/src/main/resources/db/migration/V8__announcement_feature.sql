-- A notice may be pinned over the list and shown as a popup when members come in, both only from featured_from to
-- featured_until (Seoul days, both included); outside those days it is an ordinary notice and stays in the list.
-- Administrators alone set them.
ALTER TABLE announcement ADD COLUMN is_pinned boolean DEFAULT false NOT NULL;

ALTER TABLE announcement ADD COLUMN is_popup boolean DEFAULT false NOT NULL;

ALTER TABLE announcement ADD COLUMN featured_from date;

ALTER TABLE announcement ADD COLUMN featured_until date;

-- A member pressing 확인했어요 on a notice's popup, after which it no longer pops up for them. Closing the popup
-- otherwise leaves nothing, so it shows again the next time they come in.
CREATE TABLE announcement_popup_confirmed (
    announcement_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    confirmed_at timestamptz NOT NULL,
    CONSTRAINT announcement_popup_confirmed_pkey PRIMARY KEY (announcement_id, employee_id)
-- [jooq ignore start]
    , CONSTRAINT announcement_popup_confirmed_announcement_fk FOREIGN KEY (announcement_id) REFERENCES announcement(announcement_id) ON DELETE CASCADE
    , CONSTRAINT announcement_popup_confirmed_employee_fk FOREIGN KEY (employee_id) REFERENCES employee(employee_id) ON DELETE CASCADE
-- [jooq ignore stop]
);
