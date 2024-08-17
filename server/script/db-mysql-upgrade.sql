

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
