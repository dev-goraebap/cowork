-- A project's repositories (BIT's Git 연동, D-087; 결정기록 2026-11-04 저장소 연동): one repository per host (GitHub, GitLab,
-- Gitea, the last two at their own address), its token and webhook secret kept sealed (AES-GCM under the server's
-- app.git.encryption-key, never in the clear). A connection without a token is registered by hand on the host and is
-- not checked against it. code_link ties a work item to what lives in a repository (a branch, a pull or merge request, a
-- commit naming it); integration_rule names the column an event moves a work item to (a rule without a column keeps it
-- where it is; no rule, the column the board's categories suggest).
CREATE TABLE repository_integration (
    integration_id uuid NOT NULL,
    project_id uuid NOT NULL,
    provider varchar(8) NOT NULL,
    base_url varchar(255) NOT NULL,
    repository varchar(255) NOT NULL,
    external_repository_id varchar(64),
    web_url varchar(500) NOT NULL,
    token_cipher text,
    webhook_secret_cipher text NOT NULL,
    webhook_id varchar(64),
    account_login varchar(128),
    last_event_at timestamptz,
    last_error varchar(500),
    version bigint DEFAULT 0 NOT NULL,
    created_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    created_by uuid,
    updated_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    updated_by uuid,
    CONSTRAINT repository_integration_pkey PRIMARY KEY (integration_id)
-- [jooq ignore start]
    , CONSTRAINT repository_integration_project_fkey FOREIGN KEY (project_id) REFERENCES project (project_id)
    , CONSTRAINT repository_integration_provider CHECK (provider IN ('github', 'gitlab', 'gitea'))
-- [jooq ignore stop]
);
CREATE UNIQUE INDEX ux_repository_integration_project_provider ON repository_integration (project_id, provider);

CREATE TABLE code_link (
    code_link_id uuid NOT NULL,
    integration_id uuid NOT NULL,
    issue_id uuid NOT NULL,
    kind varchar(16) NOT NULL,
    external_id varchar(255) NOT NULL,
    url varchar(1000) NOT NULL,
    title varchar(500) NOT NULL,
    state varchar(16) NOT NULL,
    author varchar(128),
    detail varchar(500),
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL,
    CONSTRAINT code_link_pkey PRIMARY KEY (code_link_id)
-- [jooq ignore start]
    , CONSTRAINT code_link_integration_fkey FOREIGN KEY (integration_id) REFERENCES repository_integration (integration_id) ON DELETE CASCADE
    , CONSTRAINT code_link_issue_fkey FOREIGN KEY (issue_id) REFERENCES issue (issue_id) ON DELETE CASCADE
    , CONSTRAINT code_link_kind CHECK (kind IN ('branch', 'pull_request', 'commit'))
    , CONSTRAINT code_link_state CHECK (state IN ('open', 'draft', 'merged', 'closed'))
-- [jooq ignore stop]
);
CREATE UNIQUE INDEX ux_code_link_integration_kind_external_issue ON code_link (integration_id, kind, external_id, issue_id);
CREATE INDEX ix_code_link_issue ON code_link (issue_id, updated_at);

CREATE TABLE integration_rule (
    project_id uuid NOT NULL,
    event varchar(16) NOT NULL,
    column_id uuid,
    updated_at timestamptz NOT NULL,
    updated_by uuid,
    CONSTRAINT integration_rule_pkey PRIMARY KEY (project_id, event)
-- [jooq ignore start]
    , CONSTRAINT integration_rule_project_fkey FOREIGN KEY (project_id) REFERENCES project (project_id)
    , CONSTRAINT integration_rule_event CHECK (event IN ('branch_push', 'pr_opened', 'pr_merged'))
-- [jooq ignore stop]
);
