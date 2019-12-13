
-- you can change the password on initial the database.
/**
CREATE USER wolfroot WITH PASSWORD '123456';
CREATE DATABASE wolf with owner=wolfroot ENCODING='UTF8';
GRANT ALL PRIVILEGES ON DATABASE wolf to wolfroot;
\c wolf wolfroot;
*/

CREATE FUNCTION unix_timestamp() RETURNS integer AS $$ 
SELECT (date_part('epoch',now()))::integer;   
$$ LANGUAGE SQL IMMUTABLE;

CREATE FUNCTION from_unixtime(int) RETURNS timestamp AS $$ 
SELECT to_timestamp($1)::timestamp; 
$$ LANGUAGE SQL IMMUTABLE;


CREATE TABLE "application" (
  id varchar(64) NOT NULL,
  name varchar(128) NOT NULL,
  "description" varchar(1024),
  create_time int NOT NULL,
  update_time int NOT NULL,
  primary key(id)
);

CREATE UNIQUE INDEX idx_application_name ON "application"(name);
COMMENT ON TABLE "application" IS 'Managed applications';


CREATE TABLE "user" (
  id bigserial,
  username varchar(64) not null,
  nickname varchar(128),
  email varchar(128),
  tel varchar(16),
  password varchar(64),
  app_ids varchar(64)[],
  manager varchar(32),
  status smallint DEFAULT 0,
  profile jsonb default NULL,
  last_login int DEFAULT 0,
  create_time int NOT NULL,
  update_time int NOT NULL,
  primary key(id)
);

CREATE UNIQUE INDEX idx_user_username ON "user"(username);
CREATE INDEX idx_user_email ON "user"(email);
CREATE INDEX idx_user_tel ON "user"(tel);
CREATE INDEX idx_user_app_ids ON "user"(app_ids);

COMMENT ON COLUMN "user".manager IS 'super,admin,NULL';

CREATE TABLE "category" (
  id serial,
  app_id varchar(64) NOT NULL,
  name varchar(64),
  create_time int NOT NULL,
  update_time int NOT NULL,
  primary key(id)
);
CREATE UNIQUE INDEX idx_category_app_id_name ON "category"(app_id,name);


CREATE TABLE "permission" (
  id varchar(64),
  app_id varchar(64) NOT NULL,
  name varchar(64) NOT NULL,
  "description" varchar(128),
  category_id int,
  create_time int NOT NULL,
  update_time int NOT NULL,
  primary key(app_id, id)
);

CREATE UNIQUE INDEX idx_permission_app_id_name ON "permission"(app_id,name);
CREATE INDEX idx_permission_category_id ON "permission"(category_id);
COMMENT ON COLUMN permission.category_id IS 'reference to category.id';

CREATE TABLE "resource" (
  id bigserial,
  app_id varchar(64) NOT NULL,
  match_type varchar(16) NOT NULL,
  name varchar(512) NOT NULL,
  name_len smallint DEFAULT 0,
  priority int DEFAULT 0,
  action varchar(64) DEFAULT 'ALL',
  perm_id varchar(64),
  create_time int NOT NULL,
  update_time int NOT NULL,
  primary key(id)
);

CREATE UNIQUE INDEX idx_resource_app_id_type_name ON "resource"(app_id,"match_type","name", action);
COMMENT ON COLUMN resource.match_type IS 'The name match type, includes the following:
1. equal, equal match
2. suffix, suffix matching
3. prefix, prefix matching (maximum matching principle)
When matching, equal matches first, if not matched,
Use suffix match, then prefix';
COMMENT ON COLUMN resource.action IS 'for http resource, action is http method: GET, HEAD, POST, OPTIONS, DELETE, PUT, PATCH, ALL means includes all.';

CREATE TABLE "role" (
  id varchar(64) ,
  app_id varchar(64) NOT NULL,
  name varchar(64) NOT NULL,
  "description" varchar(128),
  perm_ids varchar(64)[],
  create_time int NOT NULL,
  update_time int NOT NULL,
  primary key(app_id, id)
);

CREATE UNIQUE INDEX idx_role_app_id_name ON "role"(app_id, name);


CREATE TABLE "user_role" (
  user_id bigint,
  app_id varchar(64) NOT NULL,
  perm_ids varchar(64)[],
  role_ids varchar(64)[],
  create_time int NOT NULL,
  update_time int NOT NULL,
  primary key(user_id, app_id)
);

CREATE INDEX idx_user_role_perm_ids ON "user_role"(perm_ids);
CREATE INDEX idx_user_role_role_ids ON "user_role"(role_ids);

CREATE TABLE "access_log" (
  id bigserial,
  app_id varchar(64),
  user_id bigint,
  username varchar(64),
  nickname varchar(128),
  action varchar(32), 
  res_name varchar(512),
  matched_resource jsonb default NULL,
  status smallint DEFAULT 0,
  body jsonb default NULL,
  content_type varchar(128),
  date varchar(32),
  ip varchar(64),
  access_time int NOT NULL,
  primary key(id)
);
CREATE INDEX idx_access_log_app_id ON "access_log"(app_id);
CREATE INDEX idx_access_log_user_id ON "access_log"(user_id);
CREATE INDEX idx_access_log_username ON "access_log"(username);
CREATE INDEX idx_access_log_action ON "access_log"(action);
CREATE INDEX idx_access_log_res_name ON "access_log"(res_name);
CREATE INDEX idx_access_log_status ON "access_log"(status);
CREATE INDEX idx_access_log_date ON "access_log"(date);
CREATE INDEX idx_access_log_ip ON "access_log"(ip);
CREATE INDEX idx_access_log_access_time ON "access_log"(access_time);
