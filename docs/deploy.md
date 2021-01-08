[中文](deploy-cn.md)

There are two ways to deploy, Docker can be used to deploy faster. It can also be deployed manually in all steps.

## A.Docker environment deployment

#### 1.required environment

* docker
* docker-compose
* node 12+
* npm

#### 2.Building the docker image

```shell
cd path/to/wolf
bash bin/build-all.sh 0.1.10
```

After a successful build, you can view the image using the following command:

`docker images |grep wolf`

The output is approximately as follows:

```
igeeky/wolf-agent         0.1.10              c8013cdbc95d        1 hours ago         101MB
igeeky/wolf-agent         latest              c8013cdbc95d        7 hours ago         101MB
igeeky/wolf-server        0.1.10              25ee3cb46296        7 hours ago         143MB
igeeky/wolf-server        latest              25ee3cb46296        7 hours ago         143MB
```

#### 3.Starting the docker image with docker-compose

[Reference here](../quick-start-with-docker/README.md)

## B.Manual deployment

#### 1.Initializing the database

* Installing PostgreSQL

Please google the installation method yourself.

* Create accounts and databases

Login to the postgres database with a postgres account and execute the following script to create the `wolfroot` user and `wolf` database (please change the username and password as needed):

```sql
CREATE USER wolfroot WITH PASSWORD '123456';
CREATE DATABASE wolf with owner=wolfroot ENCODING='UTF8';
GRANT ALL PRIVILEGES ON DATABASE wolf to wolfroot;
-- To access the wolf database as wolfroot, if prompted for a password, please enter the password above.
\c wolf wolfroot;
```

* Creation tables

Creating database tables using scripts

```sql
\i path/to/wolf/server/script/db.sql;
```

View the created table:

```
\d
```

Output a result similar to the one below, indicating that the database table was created successfully:

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



#### 2.Server configuration items

* There are 3 main configuration parameters for the server:

  * RBAC_ROOT_PASSWORD The default password for root and admin accounts. The default is `123456`.
  * RBAC_TOKEN_KEY To encrypt the KEY used by the user token, it is highly recommended to set this value.
  * WOLF_CRYPT_KEY To encrypt the application Secret and OAuth2 login user ID keys.
  * RBAC_TOKEN_EXPIRE_TIME The expiration time of the token returned by the `Agent` login interface, the default is 30 days. The unit is seconds.
  * CONSOLE_TOKEN_EXPIRE_TIME The expiration time of the token returned by the `Console` login interface, the default is 30 days. The unit is seconds.
  * RBAC_SQL_URL The database link to the postgres database. The default is `postgres://wolfroot:123456@127.0.0.1:5432/wolf`

  The above three configurations can be configured in the system environment variables or specified at startup.

#### 3.startup server

Please install node and npm yourself.


* Important: Install the pg-native dependencies first.

```shell
# Refer to: https://www.npmjs.com/package/pg-native
On OS X: brew install postgres
On Ubuntu/Debian: apt-get install libpq-dev g++ make
On RHEL/CentOS: yum install postgresql-devel
On Windows:
Install Visual Studio C++ (successfully built with Express 2010). Express is free.
Install PostgreSQL (http://www.postgresql.org/download/windows/)
Add your Postgre Installation's bin folder to the system path (i.e. C:\Program Files\PostgreSQL\9.3\bin).
```

* Startup service.

```shell
# Set the initial password for wolf's root and admin accounts.
export RBAC_ROOT_PASSWORD=123456
# Set the Token encryption key, for system security, it is highly recommended that you change this value.
export RBAC_TOKEN_KEY=THE-NEW-TOKEN-KEY
# Set the Secret encryption key, for system security, it is highly recommended that you change this value.
export WOLF_CRYPT_KEY=THE-NEW-CRYPT-KEY
# Please make the changes according to the user and database you have created.
export RBAC_SQL_URL=postgres://wolfroot:123456@127.0.0.1:5432/wolf
cd path/to/wolf/server
# Installation dependencies (executed on first boot)
npm install
# Initiate service procedures.
npm run start
```

**If you start successfully, you should see a similar output:**

> listen at 0.0.0.0:10080 success!
>
> # The following are some initialized system account output information

#### 4.Startup Console

```shell
cd path/to/wolf/console
# Installation dependencies (executed on first boot)
npm install
# Start the console.
cnpm run dev
```

**Compile, when started successfully, you should see a similar output:**

```
 DONE  Compiled successfully in 1000ms    

  App running at:
  - Local:   http://localhost:10088/
  - Network: http://192.168.x.x:10088/
```

Once the Console has been successfully started, it is now accessible using the root account. The password is `123456` or the one you specify when starting the server with the variable `RBAC_ROOT_PASSWORD`.

#### 5.Configuring Agent

* Installing OpenResty

Please google the installation method yourself.

- Create applications in Console, and the corresponding users, roles, permissions, resources, etc.

* Add Agent configuration to nginx.conf (or the subconfiguration it contains) (the following configuration assumes Wolf's code is in the `/opt` directory)

```nginx
# The following configuration is within the HTTP node.

lua_code_cache on;
client_max_body_size 5m;
client_body_buffer_size 256k;
lua_package_path "/opt/wolf/agent/lua/?.lua;;";

server {
    # Apply external address, port. If you need to configure the domain name, you need to configure it here as well.
    listen   10082;
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
        proxy_pass   http://127.0.0.1:10080;
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
        proxy_pass http://127.0.0.1:10084;
    }
}
```



#### 6.Startup Agent(Nginx)

```
# Test.
path/to/nginx/sbin/nginx -t
# Startup
path/to/nginx/sbin/nginx 
```

Once started, you can access the application at: `http://127.0.0.1:10082`. You will need to enter a username and password to access the application.