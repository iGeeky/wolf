-- you can change the password on initial the database.
/**
create database `wolf` CHARACTER SET utf8mb4;
grant DELETE,EXECUTE,INSERT,SELECT,UPDATE
on wolf.* to wolfroot@'127.0.0.1' IDENTIFIED BY '123456';
grant DELETE,EXECUTE,INSERT,SELECT,UPDATE
on wolf.* to wolfroot@'localhost' IDENTIFIED BY '123456';
FLUSH PRIVILEGES;
use wolf;
*/


CREATE TABLE `application` (
  id varchar(64) NOT NULL comment 'application id, client.id in oauth2',
  name varchar(128) NOT NULL,
  `description` varchar(256),
  secret varchar(128) DEFAULT NULL comment 'client.secret in oauth2',
  redirect_uris text DEFAULT NULL comment 'client.redirect_uris in oauth2',
  grants text DEFAULT NULL,
  access_token_lifetime bigint DEFAULT NULL comment 'access_token.lifetime in oauth2',
  refresh_token_lifetime bigint DEFAULT NULL comment 'refresh_token.lifetime in oauth2',
  create_time bigint NOT NULL,
  update_time bigint NOT NULL,
  primary key(id),
  unique key(name)
)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_bin comment 'Managed applications';

CREATE TABLE `user` (
  id bigint auto_increment,
  username varchar(128) not null,
  nickname varchar(128),
  email varchar(128),
  tel varchar(32),
  password varchar(128),
  app_ids text,
  manager varchar(32) comment 'super,admin,NULL',
  status smallint DEFAULT 0,
  auth_type smallint DEFAULT 1 comment 'user authentication type, 1: password, 2: LDAP',
  profile text default NULL,
  last_login bigint DEFAULT 0,
  create_time bigint NOT NULL,
  update_time bigint NOT NULL,
  primary key(id),
  unique key(username),
  key(email),
  key(tel)
)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_bin comment 'users';


CREATE TABLE `category` (
  id int auto_increment,
  app_id varchar(64) NOT NULL,
  name varchar(128),
  create_time bigint NOT NULL,
  update_time bigint NOT NULL,
  primary key(id),
  unique key(app_id, name)
)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_bin comment 'permisstion category';
 

CREATE TABLE `permission` (
  id varchar(64),
  app_id varchar(64) NOT NULL,
  name varchar(128),
  `description` varchar(256),
  category_id int comment 'reference to category.id',
  create_time bigint NOT NULL,
  update_time bigint NOT NULL,
  primary key(app_id, id),
  unique key(app_id, name),
  key(category_id)
)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_bin;


CREATE TABLE `resource` (
  id bigint auto_increment,
  app_id varchar(64) NOT NULL,
  match_type varchar(16) NOT NULL comment 'The name match type, includes the following:
1. equal, equal match
2. suffix, suffix matching
3. prefix, prefix matching (maximum matching principle)
4. radixtree, radixtree matching
When matching, equal matches first, if not matched,
Use suffix match, then prefix. radixtree is incompatible with other types and uses its own matching algorithm.',
  name varchar(256) NOT NULL,
  name_len smallint DEFAULT 0,
  priority bigint DEFAULT 0,
  action varchar(16) NOT NULL comment 'for http resource, action is http method: GET, HEAD, POST, OPTIONS, DELETE, PUT, PATCH, ALL means includes all.',
  perm_id varchar(64),
  hosts text,
  remote_addrs text,
  exprs text,
  create_time bigint NOT NULL,
  update_time bigint NOT NULL,
  primary key(id),
  unique key(app_id,`match_type`,`name`, action)
)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_bin;


CREATE TABLE `role` (
  id varchar(64) ,
  app_id varchar(64) NOT NULL,
  name varchar(128) NOT NULL,
  `description` varchar(256),
  perm_ids text,
  create_time bigint NOT NULL,
  update_time bigint NOT NULL,
  primary key(app_id, id),
  unique key(app_id, name)
)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_bin;


CREATE TABLE `user_role` (
  user_id bigint,
  app_id varchar(64) NOT NULL,
  perm_ids text,
  role_ids text,
  create_time bigint NOT NULL,
  update_time bigint NOT NULL,
  primary key(user_id, app_id)
)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_bin;


CREATE TABLE `access_log` (
  id bigint auto_increment,
  app_id varchar(64),
  user_id varchar(64),
  username varchar(128),
  nickname varchar(128),
  action varchar(16),
  res_name varchar(256),
  matched_resource text default NULL,
  status smallint DEFAULT 0,
  body text default NULL,
  content_type varchar(32),
  date varchar(32),
  ip varchar(32),
  access_time bigint NOT NULL,
  primary key(id),
  key(app_id),
  key(user_id),
  key(username),
  key(action),
  key(res_name),
  key(status),
  key(date),
  key(ip),
  key(access_time)
)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_bin;


CREATE TABLE oauth_code (
  id bigint auto_increment,
  authorization_code varchar(128) NOT NULL comment 'authorization_code in oauth',
  expires_at timestamp NOT NULL,
  redirect_uri varchar(256) NOT NULL,
  scope varchar(64) DEFAULT NULL,
  client_id varchar(128) NOT NULL,
  user_id varchar(128) NOT NULL,
  create_time bigint NOT NULL,
  update_time bigint NOT NULL,
  primary key(id),
  key(authorization_code),
  key(user_id)
)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_bin;


CREATE TABLE oauth_token (
  id bigint auto_increment,
  access_token varchar(256) NOT NULL,
  access_token_expires_at timestamp NOT NULL,
  client_id varchar(128) NOT NULL comment 'client_id in oauth, which corresponds to application.id in this system',
  refresh_token varchar(256),
  refresh_token_expires_at timestamp,
  scope varchar(64) DEFAULT NULL,
  user_id varchar(128) NOT NULL comment 'ID of the user corresponding to client_id, mapped to user.id',
  create_time bigint NOT NULL,
  update_time bigint NOT NULL,
  primary key(id),
  unique key(access_token),
  unique key(refresh_token),
  index(user_id)
)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE utf8mb4_bin;
