

-- upgrade to 0.5.x (ldap version)

ALTER TABLE `user` ADD COLUMN auth_type smallint DEFAULT 1 comment 'user authentication type, 1: password, 2: LDAP';
