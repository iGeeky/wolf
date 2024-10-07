[中文](deploy-cn.md)

There are two ways to deploy the system: using Docker or manually.

The default login method is password-based, and if you want to log in with LDAP, please refer to the [LDAP Configuration Guide](./ldap-config.md).

## A. Docker Environment Deployment

#### 1. Required Environment

- Docker
- Docker Compose
- Node.js 12+
- npm

#### 2. Building the Docker Image

```shell
cd path/to/wolf
bash bin/build-all.sh 0.1.10
```

After a successful build, you can view the image using the following command:

`docker images |grep wolf`

The output should look similar to this:

```
igeeky/wolf-agent         0.1.10              c8013cdbc95d        1 hours ago         101MB
igeeky/wolf-agent         latest              c8013cdbc95d        7 hours ago         101MB
igeeky/wolf-server        0.1.10              25ee3cb46296        7 hours ago         143MB
igeeky/wolf-server        latest              25ee3cb46296        7 hours ago         143MB
```

#### 3.Starting the Docker Image with Docker Compose

For instructions, please refer to: [Quick Start with Docker.](../quick-start-with-docker/README.md)

## B.Manual deployment

#### 1.Initializing the database

You can choose between `PostgreSQL` and `MySQL` databases, and we recommend using PostgreSQL.

###### PostgreSQL

* Installing PostgreSQL

You can find the installation method by searching on Google.

* Create accounts and databases

To create the `wolfroot` user and `wolf` database (with custom username and password if needed), log in to the PostgreSQL database with a PostgreSQL account and execute the following script:

```sql
CREATE USER wolfroot WITH PASSWORD '123456';
CREATE DATABASE wolf with owner=wolfroot ENCODING='UTF8';
GRANT ALL PRIVILEGES ON DATABASE wolf to wolfroot;
```

* Creation tables

Creating database tables using scripts

```sql
\i path/to/wolf/server/script/db-psql.sql;
```

To view the created table, run the following command:

```
\d
```

The output should look similar to this, indicating a successful creation of the database table:

```
               List of relations
 Schema |       Name        |   Type   |  Owner
--------+-------------------+----------+----------
 public | access_log        | table    | wolfroot
 public | access_log_id_seq | sequence | wolfroot
 public | application       | table    | wolfroot
 public | category          | table    | wolfroot
 public | category_id_seq   | sequence | wolfroot
 public | permission        | table    | wolfroot
 public | resource          | table    | wolfroot
 public | resource_id_seq   | sequence | wolfroot
 public | role              | table    | wolfroot
 public | user              | table    | wolfroot
 public | user_id_seq       | sequence | wolfroot
 public | user_role         | table    | wolfroot
(12 rows)
```

###### MySQL

* Installing MySQL

Please search for the installation method on your own.

* Create Accounts and Databases

Login to the MySQL database using a MySQL account and run the following script to create the `wolfroot` user and `wolf` database (change the username and password as needed):

```sql
create database `wolf` CHARACTER SET utf8mb4;
grant DELETE,EXECUTE,INSERT,SELECT,UPDATE
on wolf.* to wolfroot@'127.0.0.1' IDENTIFIED BY '123456';
grant DELETE,EXECUTE,INSERT,SELECT,UPDATE
on wolf.* to wolfroot@'localhost' IDENTIFIED BY '123456';
FLUSH PRIVILEGES;
use wolf;
```

* Creating Tables

Create the database tables using the following script:

```sql
source path/to/wolf/server/script/db-mysql.sql;
```

Run the following command to view the created tables:

```
show tables;
```

The output should be similar to the following, indicating that the database tables have been successfully created:

```

+----------------+
| Tables_in_wolf |
+----------------+
| access_log     |
| application    |
| category       |
| oauth_code     |
| oauth_token    |
| permission     |
| resource       |
| role           |
| user           |
| user_role      |
+----------------+
10 rows in set (0.01 sec)
```

#### 2.Server Configuration Items

- The main configuration parameters of the server are as follows:

  * `RBAC_ROOT_PASSWORD`: The default password for the root and admin accounts. The default value is `123456`.
  * `RBAC_TOKEN_KEY`: A key used to encrypt the user token. It is highly recommended to set this value.
  * `WOLF_CRYPT_KEY`: A key used to encrypt the application secret and OAuth2 login user ID keys.
  * `RBAC_TOKEN_EXPIRE_TIME`: The expiration time of the token returned by the `Agent` login interface. The default is 30 days and the unit is seconds.
  * `CONSOLE_TOKEN_EXPIRE_TIME`: The expiration time of the token returned by the `Console` login interface. The default is 30 days and the unit is seconds.
  * `CONSOLE_LOGIN_WITH_CAPTCHA`: Controls whether Captcha verification is used for `Console` login. If the console is deployed on a public network, it is recommended to enable this feature to improve security. The environment variable can be set to `yes` or `no`, with a default value of `no`.
  * `RBAC_SQL_URL`: The link to the database. The default value is `postgres://wolfroot:123456@127.0.0.1:5432/wolf`.
  * `RBAC_REDIS_URL`: The link to the redis cache. The default value is `redis://127.0.0.1:6379/0`.
  * `MEM_CACHE_BY_REDIS`: Use redis as the object cache. The default is no. When deploying a multi-node wolf service, you can use redis as the object cache to resolve cache inconsistency issues.
  * `RBAC_USE_RADIX_TREE_ROUTING`: When set to `yes`, it uses radixtree for RBAC access route matching. The default is `no`. `radixtree` is a more complex routing matching method that supports various complex wildcard matches.


#### 3.Starting the Server

Please install node and npm yourself.

* Starting the Service

```shell
# Set the initial password for wolf's root and admin accounts.
export RBAC_ROOT_PASSWORD=123456
# Set the Token encryption key, for system security, it is highly recommended that you change this value.
export RBAC_TOKEN_KEY=THE-NEW-TOKEN-KEY
# Set the Secret encryption key, for system security, it is highly recommended that you change this value.
export WOLF_CRYPT_KEY=THE-NEW-CRYPT-KEY
# Please make the changes according to the user and database you have created.
export RBAC_SQL_URL=postgres://wolfroot:123456@127.0.0.1:5432/wolf
# Please modify it according to the actual configuration of redis.
export RBAC_REDIS_URL=redis://127.0.0.1:6379/0

cd path/to/wolf/server
# Installation dependencies (executed on first boot)
npm install
# Initiate service procedures.
npm run start
```

**If the service starts successfully, you should see output similar to the following:**

> listen at 0.0.0.0:12180 success!
>
> The following are some initialized system account output information

#### 4.Start the Console

```shell
cd path/to/wolf/console
# Installation dependencies (executed on first boot)
npm install
# Start the console.
cnpm run dev
```

**After compiling the Console, if it starts successfully, you should see an output similar to the following:**

```
 DONE  Compiled successfully in 1000ms

  App running at:
  - Local:   http://localhost:12188/
  - Network: http://192.168.x.x:12188/
```

You can now access the Console using the root account. The password is `123456` or the one you specified when starting the server with the `RBAC_ROOT_PASSWORD` environment variable.

#### 5.Configuring the Agent

Note: If you are using the `apisix` gateway, you may prefer to use the `wolf-rbac` plugin for [apisix](https://github.com/apache/apisix/blob/master/docs/en/latest/plugins/wolf-rbac.md) instead of using an Agent. This plugin also acts as an Agent.


* Installing OpenResty

Please search for the installation method yourself.

* Create applications in the Console, along with corresponding users, roles, permissions, resources, etc.

* Add the Agent configuration to nginx.conf (or the sub-configurations that it contains). The following configuration assumes that the Wolf code is located in the `/opt` directory:

```nginx
# The following configuration is within the HTTP node.

lua_code_cache on;
client_max_body_size 5m;
client_body_buffer_size 256k;
lua_package_path "/opt/wolf/agent/lua/?.lua;;";

server {
    # Apply external address, port. If you need to configure the domain name, you need to configure it here as well.
    listen   12182;
    server_name localhost;

  	# If it is a restful interface, you need to customize the json format that is returned without permissions. This needs to be coordinated with the front-end.
    location = /wolf/rbac/no_permission {
        content_by_lua_block {
            ngx.status = 200;
            ngx.header["Content-Type"] = "application/json; charset=utf-8";
            local args, err = ngx.req.get_uri_args()
            local reason = args.reason or "unknown reason"
            ngx.say(string.format([[ {"ok": false, "reason": "%s"} ]], reason))
        }
    }

    location /wolf/rbac {
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header REMOTE-HOST $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    		# rbac server address. If the server is not local, please change the IP address to the actual address.
        proxy_pass   http://127.0.0.1:12180;
    }

    # Clear the content-length of response
    header_filter_by_lua_file /opt/wolf/agent/lua/header_filter.lua;
    # filter, add infobar to the page
    body_filter_by_lua_file /opt/wolf/agent/lua/body_filter.lua;

    # proxy for application
    location / {
        # $appID，You need to set an application ID that is already configured in Wolf-Server.
        set $appID appIDInWolfServer;
        # access check
        access_by_lua_file /opt/wolf/agent/lua/access_check.lua;

        #proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header REMOTE-HOST $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        # The real address and port of the APP that requires privileged access control
        proxy_pass http://127.0.0.1:12184;
    }
}
```



#### 6.Startup the Agent(Nginx)

```
# Test.
path/to/nginx/sbin/nginx -t
# Startup
path/to/nginx/sbin/nginx 
```

Once started, you can access the application at `http://127.0.0.1:12182`. You will need to enter a username and password to access the application.
