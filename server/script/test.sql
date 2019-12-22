CREATE USER root WITH PASSWORD '123456';
CREATE DATABASE wolf with owner=root ENCODING='UTF8';
GRANT ALL PRIVILEGES ON DATABASE wolf to root;
\c wolf root;

CREATE TABLE "application" (
  id varchar(64) NOT NULL,
  name varchar(128) NOT NULL,
  "description" varchar(1024),
  create_time int NOT NULL,
  update_time int NOT NULL,
  primary key(id)
);