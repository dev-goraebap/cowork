-- How a member looks in the town, kept once they have been through its welcome: the parts their character is put
-- together from, as the screen writes them. Where they stand is not kept: it lives in the server's memory while their
-- screen is open.
CREATE TABLE town_resident (
    employee_id uuid NOT NULL,
    appearance text NOT NULL,
    updated_at timestamptz NOT NULL,
    CONSTRAINT town_resident_pkey PRIMARY KEY (employee_id)
-- [jooq ignore start]
    , CONSTRAINT town_resident_employee_fk FOREIGN KEY (employee_id) REFERENCES employee(employee_id) ON DELETE CASCADE
-- [jooq ignore stop]
);
