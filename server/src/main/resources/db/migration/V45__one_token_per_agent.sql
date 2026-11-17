ALTER TABLE agent_profile ADD COLUMN legacy_shared boolean DEFAULT false NOT NULL;

-- A shared profile's old activities identify the profile, not the token that ran them.
-- Keep that profile for history and give each of its tokens a new profile for future activity.
-- [jooq ignore start]
CREATE TEMP TABLE agent_profile_split (
 token_id uuid PRIMARY KEY,
 old_profile_id uuid NOT NULL,
 new_profile_id uuid NOT NULL
);

INSERT INTO agent_profile_split(token_id, old_profile_id, new_profile_id)
SELECT token_id, profile_id,
       lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' ||
             substr(hex(randomblob(2)), 2) || '-8' || substr(hex(randomblob(2)), 2) || '-' || hex(randomblob(6)))
FROM agent_token
WHERE profile_id IN (SELECT profile_id FROM agent_token GROUP BY profile_id HAVING count(*) > 1);

UPDATE agent_profile SET legacy_shared = true
WHERE profile_id IN (SELECT old_profile_id FROM agent_profile_split);

INSERT INTO agent_profile(profile_id, user_id, name, icon, color)
SELECT split.new_profile_id, profile.user_id, profile.name, profile.icon, profile.color
FROM agent_profile_split split JOIN agent_profile profile ON profile.profile_id = split.old_profile_id;

UPDATE agent_token
SET profile_id = (SELECT new_profile_id FROM agent_profile_split WHERE agent_profile_split.token_id = agent_token.token_id)
WHERE token_id IN (SELECT token_id FROM agent_profile_split);

DROP TABLE agent_profile_split;
-- [jooq ignore stop]

DROP INDEX ix_agent_token_profile;
CREATE UNIQUE INDEX uq_agent_token_profile ON agent_token(profile_id);
