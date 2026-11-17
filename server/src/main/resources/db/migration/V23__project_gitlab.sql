-- GitLab repositories connected to a project (R-o6nwhpqbbu, D-fhbtjwmuvn), and the commits and merge requests their
-- webhooks link to the project's work items when a commit message or MR title, description or source branch names a
-- work key (ALL-123). Disconnecting a repository deletes the commit and MR links it brought in.

CREATE TABLE pj_gitlab_repo (
    repo_id uuid NOT NULL,
    project_id uuid NOT NULL,
    repo_path varchar(200) NOT NULL,
    web_url varchar(500) NOT NULL,
    webhook_token varchar(64) NOT NULL,
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    CONSTRAINT pj_gitlab_repo_pkey PRIMARY KEY (repo_id)
-- [jooq ignore start]
    , CONSTRAINT pj_gitlab_repo_project_fk FOREIGN KEY (project_id) REFERENCES pj_project(project_id) ON DELETE CASCADE
-- [jooq ignore stop]
);

CREATE UNIQUE INDEX ux_pj_gitlab_repo_path ON pj_gitlab_repo (project_id, repo_path);
CREATE UNIQUE INDEX ux_pj_gitlab_repo_token ON pj_gitlab_repo (webhook_token);
CREATE INDEX pj_gitlab_repo_project_idx ON pj_gitlab_repo (project_id);

CREATE TABLE pj_gitlab_commit (
    commit_id uuid NOT NULL,
    repo_id uuid NOT NULL,
    work_item_id uuid NOT NULL,
    sha varchar(64) NOT NULL,
    short_sha varchar(12) NOT NULL,
    title varchar(300) NOT NULL,
    author_name varchar(120) NOT NULL,
    committed_at timestamptz NOT NULL,
    web_url varchar(500) NOT NULL,
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    CONSTRAINT pj_gitlab_commit_pkey PRIMARY KEY (commit_id)
-- [jooq ignore start]
    , CONSTRAINT pj_gitlab_commit_repo_fk FOREIGN KEY (repo_id) REFERENCES pj_gitlab_repo(repo_id) ON DELETE CASCADE
    , CONSTRAINT pj_gitlab_commit_work_item_fk FOREIGN KEY (work_item_id) REFERENCES pj_work_item(work_item_id) ON DELETE CASCADE
-- [jooq ignore stop]
);

CREATE UNIQUE INDEX ux_pj_gitlab_commit_item_sha ON pj_gitlab_commit (repo_id, work_item_id, sha);
CREATE INDEX pj_gitlab_commit_work_item_idx ON pj_gitlab_commit (work_item_id, committed_at);
CREATE INDEX pj_gitlab_commit_repo_idx ON pj_gitlab_commit (repo_id);

CREATE TABLE pj_gitlab_mr (
    mr_id uuid NOT NULL,
    repo_id uuid NOT NULL,
    work_item_id uuid NOT NULL,
    iid integer NOT NULL,
    title varchar(300) NOT NULL,
    state varchar(16) NOT NULL,
    author_name varchar(120) NOT NULL,
    source_branch varchar(200) NOT NULL,
    target_branch varchar(200) NOT NULL,
    web_url varchar(500) NOT NULL,
    updated_at timestamptz NOT NULL,
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    CONSTRAINT pj_gitlab_mr_pkey PRIMARY KEY (mr_id)
-- [jooq ignore start]
    , CONSTRAINT ck_pj_gitlab_mr_state CHECK (state IN ('OPENED', 'MERGED', 'CLOSED'))
    , CONSTRAINT pj_gitlab_mr_repo_fk FOREIGN KEY (repo_id) REFERENCES pj_gitlab_repo(repo_id) ON DELETE CASCADE
    , CONSTRAINT pj_gitlab_mr_work_item_fk FOREIGN KEY (work_item_id) REFERENCES pj_work_item(work_item_id) ON DELETE CASCADE
-- [jooq ignore stop]
);

CREATE UNIQUE INDEX ux_pj_gitlab_mr_item_iid ON pj_gitlab_mr (repo_id, work_item_id, iid);
CREATE INDEX pj_gitlab_mr_work_item_idx ON pj_gitlab_mr (work_item_id, updated_at);
CREATE INDEX pj_gitlab_mr_repo_idx ON pj_gitlab_mr (repo_id);
