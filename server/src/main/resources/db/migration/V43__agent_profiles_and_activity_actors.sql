-- 기존 토큰은 이름이 같아도 합치지 않고 각각 프로필을 갖는다.
CREATE TABLE agent_profile (
 profile_id uuid NOT NULL PRIMARY KEY,
 user_id uuid NOT NULL,
 name varchar(64) NOT NULL,
 icon varchar(100) NOT NULL,
 color varchar(7) NOT NULL,
 version bigint DEFAULT 0 NOT NULL
-- [jooq ignore start]
 , FOREIGN KEY(user_id) REFERENCES users(user_id)
 , CHECK(length(trim(name)) BETWEEN 1 AND 64)
-- [jooq ignore stop]
);
CREATE INDEX ix_agent_profile_user ON agent_profile(user_id,name,profile_id);
ALTER TABLE agent_token ADD COLUMN profile_id uuid REFERENCES agent_profile(profile_id);
INSERT INTO agent_profile(profile_id,user_id,name,icon,color) SELECT token_id,user_id,agent_name,'agent','#5e6ad2' FROM agent_token;
UPDATE agent_token SET profile_id=token_id;
CREATE INDEX ix_agent_token_profile ON agent_token(profile_id);
-- 과거 활동은 실행 방식을 추정해 채우지 않는다.
ALTER TABLE activity_entry ADD COLUMN actor_source varchar(8);
ALTER TABLE activity_entry ADD COLUMN agent_profile_id uuid;
ALTER TABLE activity_entry ADD COLUMN agent_name varchar(64);
ALTER TABLE activity_entry ADD COLUMN agent_icon varchar(100);
ALTER TABLE activity_entry ADD COLUMN agent_color varchar(7);
