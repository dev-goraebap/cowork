-- Agent tokens: a member makes a token in 내 계정 › 에이전트 토큰 for an agent (Claude Code
-- and the like) that reaches the server through its MCP server at /api/mcp and acts as that member. The token itself is
-- shown once when it is made and never kept: token_hash is its HMAC (the sessions' secret, its own purpose) and prefix
-- its first characters, by which the list tells tokens apart. name says what it is for and agent_name which agent uses
-- it, written beside the member in the activity record. A token without expires_at lasts until it is revoked; one is
-- revoked by its owner, or with every other when the member leaves. last_used_at and last_used_ip follow its use at
-- most once a minute.
CREATE TABLE agent_token (
    token_id uuid NOT NULL,
    user_id uuid NOT NULL,
    name varchar(64) NOT NULL,
    agent_name varchar(64) NOT NULL,
    prefix varchar(16) NOT NULL,
    token_hash varchar(64) NOT NULL,
    created_at timestamptz NOT NULL,
    expires_at timestamptz,
    last_used_at timestamptz,
    last_used_ip varchar(45),
    revoked_at timestamptz,
    CONSTRAINT agent_token_pkey PRIMARY KEY (token_id)
-- [jooq ignore start]
    , CONSTRAINT agent_token_user_fkey FOREIGN KEY (user_id) REFERENCES users (user_id)
-- [jooq ignore stop]
);
CREATE UNIQUE INDEX ux_agent_token_hash ON agent_token (token_hash);
CREATE INDEX ix_agent_token_user ON agent_token (user_id, created_at, token_id);
