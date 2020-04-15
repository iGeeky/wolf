
-- upgrade to oauth2 version

ALTER TABLE "application" ADD COLUMN secret text DEFAULT NULL;
ALTER TABLE "application" ADD COLUMN redirect_uris text[] DEFAULT NULL;
ALTER TABLE "application" ADD COLUMN grants text[] DEFAULT NULL;
ALTER TABLE "application" ADD COLUMN access_token_lifetime bigint DEFAULT NULL;
ALTER TABLE "application" ADD COLUMN refresh_token_lifetime bigint DEFAULT NULL;

COMMENT ON COLUMN application.id IS 'application id, client.id in oauth2';
COMMENT ON COLUMN application.secret IS 'client.secret in oauth2';
COMMENT ON COLUMN application.redirect_uris IS 'client.redirect_uris in oauth2';
COMMENT ON COLUMN application.access_token_lifetime IS 'access_token.lifetime in oauth2';
COMMENT ON COLUMN application.refresh_token_lifetime IS 'refresh_token.lifetime in oauth2';

ALTER TABLE access_log ALTER COLUMN user_id TYPE text;

CREATE TABLE oauth_code (
  id bigserial NOT NULL,
  authorization_code text NOT NULL,
  expires_at timestamp without time zone NOT NULL,
  redirect_uri text NOT NULL,
  scope text DEFAULT NULL,
  client_id text NOT NULL,
  user_id text NOT NULL,
  create_time bigint NOT NULL,
  update_time bigint NOT NULL,
  primary key(id)
);
CREATE UNIQUE INDEX idx_oauth_code_authorization_code ON "oauth_code"(authorization_code);
CREATE INDEX idx_oauth_code_user_id ON "oauth_token"(user_id);
COMMENT ON COLUMN oauth_code.authorization_code IS 'authorization_code in oauth';


CREATE TABLE oauth_token (
  id bigserial NOT NULL,
  access_token text NOT NULL,
  access_token_expires_at timestamp without time zone NOT NULL,
  client_id text NOT NULL,
  refresh_token text,
  refresh_token_expires_at timestamp without time zone,
  scope text DEFAULT NULL,
  user_id text NOT NULL,
  create_time bigint NOT NULL,
  update_time bigint NOT NULL,
  primary key(id)
);
CREATE UNIQUE INDEX idx_oauth_token_access_token ON "oauth_token"(access_token);
CREATE UNIQUE INDEX idx_oauth_token_refresh_token ON "oauth_token"(refresh_token);
CREATE INDEX idx_oauth_token_user_id ON "oauth_token"(user_id);

COMMENT ON COLUMN oauth_token.client_id IS 'client_id in oauth, which corresponds to application.id in this system';
COMMENT ON COLUMN oauth_token.user_id IS 'ID of the user corresponding to client_id, mapped to user.id';