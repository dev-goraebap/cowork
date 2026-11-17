-- 본문을 최상위 블록 단위로 저장한다(2026-11-11 사용자 결정, .agents/skills/cowork-runtime/references/document-blocks.md).
-- rich_block이 원본이고, rich_body.body는 같은 트랜잭션에서 블록을 차례대로 이어 붙인 조립본이다(읽기·MCP·검색·인쇄가 그대로 쓴다).
-- 블록 version은 그 블록을 마지막으로 바꾼 본문 version이다. 저장은 바뀐 블록만 받고 블록 version으로 충돌을 가린다.
CREATE TABLE rich_block (
    owner_id uuid NOT NULL,
    block_id varchar(64) NOT NULL,
    -- 끼워 넣기 쉬운 순서 키(사전순). 블록을 넣거나 옮길 때 그 블록의 키만 앞뒤 사이 값으로 새로 정한다.
    position varchar(255) NOT NULL,
    node text NOT NULL,
    version bigint NOT NULL,
    updated_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    updated_by uuid,
    CONSTRAINT rich_block_pkey PRIMARY KEY (owner_id, block_id)
-- [jooq ignore start]
    , CONSTRAINT rich_block_owner_fkey FOREIGN KEY (owner_id) REFERENCES rich_body (owner_id) ON DELETE CASCADE
    , CONSTRAINT rich_block_node CHECK (json_valid(node))
-- [jooq ignore stop]
);
CREATE INDEX ix_rich_block_order ON rich_block (owner_id, position);

-- 블록마다 누가 언제 바꿨는지(본문 version 하나에 바뀐 블록들). node가 없으면 지운 것이다.
CREATE TABLE rich_block_change (
    owner_id uuid NOT NULL,
    version bigint NOT NULL,
    block_id varchar(64) NOT NULL,
    node text,
    changed_at timestamptz DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now') || substr(strftime('%f', 'now'), 3) || '000Z') NOT NULL,
    changed_by uuid,
    CONSTRAINT rich_block_change_pkey PRIMARY KEY (owner_id, version, block_id)
-- [jooq ignore start]
    , CONSTRAINT rich_block_change_owner_fkey FOREIGN KEY (owner_id) REFERENCES rich_body (owner_id) ON DELETE CASCADE
-- [jooq ignore stop]
);

-- 본문 루트의 attrs(페이지 설정 등). 블록과 따로 둔다.
ALTER TABLE rich_body ADD COLUMN attrs text;

-- 버전 사본은 gzip으로 줄여 둔다(body는 빈 글이 된다). 옛 사본은 V55가 옮긴다.
ALTER TABLE rich_body_revision ADD COLUMN body_gz blob;
