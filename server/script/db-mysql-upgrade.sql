

-- upgrade to 0.5.x (ldap version)

ALTER TABLE `user` ADD COLUMN auth_type smallint DEFAULT 1 comment 'user authentication type, 1: password, 2: LDAP';

-- upgrade to 0.6.x (radix router version)

-- Add new columns to the resource table
ALTER TABLE `resource`
ADD COLUMN `hosts` text COMMENT 'Array of host names for which this resource is valid',
ADD COLUMN `remote_addrs` text COMMENT 'Array of remote addresses (IP or CIDR) allowed to access this resource',
ADD COLUMN `exprs` text COMMENT 'Array of expressions for additional matching conditions';

-- Update the comment for match_type to include radixtree
ALTER TABLE `resource`
MODIFY COLUMN `match_type` varchar(16) NOT NULL COMMENT 'The name match type, includes the following:
1. equal, equal match
2. suffix, suffix matching
3. prefix, prefix matching (maximum matching principle)
4. radixtree, radixtree matching
When matching, equal matches first, if not matched,
Use suffix match, then prefix. radixtree is incompatible with other types and uses its own matching algorithm.';


-- upgrade to 0.8.x (AI agent version)

CREATE TABLE `ai_chat_session` (
  id bigint auto_increment,
  user_id bigint NOT NULL,
  title text DEFAULT '',
  app_id varchar(64) DEFAULT NULL,
  status smallint DEFAULT 1,
  memory_extracted_at bigint DEFAULT 0,
  create_time bigint NOT NULL,
  update_time bigint NOT NULL,
  primary key(id),
  index(user_id)
)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_bin;

CREATE TABLE `ai_chat_message` (
  id bigint auto_increment,
  session_id bigint NOT NULL,
  role varchar(32) NOT NULL,
  content json NOT NULL,
  token_usage json DEFAULT NULL,
  create_time bigint NOT NULL,
  primary key(id),
  index(session_id),
  CONSTRAINT fk_ai_chat_message_session FOREIGN KEY (session_id) REFERENCES ai_chat_session(id) ON DELETE CASCADE
)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_bin;

CREATE TABLE `ai_user_memory` (
  id bigint auto_increment,
  user_id bigint NOT NULL,
  session_id bigint DEFAULT NULL,
  category varchar(32) NOT NULL,
  content text NOT NULL,
  source varchar(16) DEFAULT 'auto',
  status smallint DEFAULT 1,
  create_time bigint NOT NULL,
  update_time bigint NOT NULL,
  primary key(id),
  index(user_id)
)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_bin;

-- upgrade to 0.8.1 (AI memory version)
-- Run this if already on 0.8.x:
-- ALTER TABLE `ai_chat_session` ADD COLUMN memory_extracted_at bigint DEFAULT 0;
