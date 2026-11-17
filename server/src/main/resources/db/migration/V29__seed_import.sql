-- Seed files brought in on a server nobody can call the API for (the dev server): every JSON
-- file in the seed folder beside the database is brought in once, each in a transaction of its own, when the server
-- has started. A file brought in has its row here, by its name in the folder, with the SHA-256 of its bytes then, when,
-- and what was made in a few words; a file that failed has none, so a fixed one is tried again on the next start.
CREATE TABLE seed_import (
    file_name varchar(255) NOT NULL,
    checksum varchar(64) NOT NULL,
    imported_at timestamptz NOT NULL,
    summary varchar(1000) NOT NULL,
    CONSTRAINT seed_import_pkey PRIMARY KEY (file_name)
);
