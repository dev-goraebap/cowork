-- Where a request came from when it did not go through approval in the app: DISCORD for the leave and overtime the
-- company recorded in a chat channel before. Empty for every request made in the app. origin_key names the source
-- record, so bringing the same file in again adds nothing; origin_link is the original post when it was given.
ALTER TABLE approval_request ADD COLUMN origin varchar(16);

ALTER TABLE approval_request ADD COLUMN origin_key varchar(128);

ALTER TABLE approval_request ADD COLUMN origin_link text;

CREATE UNIQUE INDEX ux_approval_request_origin_key ON approval_request (origin_key);
