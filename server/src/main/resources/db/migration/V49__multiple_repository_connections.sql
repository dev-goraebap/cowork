-- Keep every connection and its secrets, hooks and code links; uniqueness belongs to a repository, not a provider.
DROP INDEX ux_repository_integration_project_provider;
-- [jooq ignore start]
CREATE UNIQUE INDEX ux_repository_integration_project_repository
    ON repository_integration (project_id, provider, base_url, repository COLLATE NOCASE);
-- [jooq ignore stop]
