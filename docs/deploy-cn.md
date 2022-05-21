[English](deploy.md)

部署方式有两种, 可以采用Docker进行部署, 比较快速. 也可以所有步骤都手动部署.

这里默认是使用密码登录, 如果要使用LDAP方式登录, 请参考[这里](./ldap-config-cn.md).

## A.Docker环境部署

#### 1.必要环境

* docker
* docker-compose
* node 12+
* npm

#### 2.构建docker镜像

```shell
cd path/to/wolf
bash bin/build-all.sh 0.1.10
```

构建成功后, 可以使用如下命令查看镜像:

`docker images |grep wolf`

输出大概如下: 

```
igeeky/wolf-agent         0.1.10              c8013cdbc95d        1 hours ago         101MB
igeeky/wolf-agent         latest              c8013cdbc95d        7 hours ago         101MB
igeeky/wolf-server        0.1.10              25ee3cb46296        7 hours ago         143MB
igeeky/wolf-server        latest              25ee3cb46296        7 hours ago         143MB
```

#### 3.使用docker-compose启动docker镜像

[参考这里](../quick-start-with-docker/README-CN.md)

## B.手动部署

#### 1.初始化数据库

`PostgreSQL`与`MySQL`数据库二选一, 推荐使用`PostgreSQL`.

###### PostgreSQL

* 安装PostgreSQL

请自行google安装方法.

* 创建账号及数据库

以postgres账号登陆postgres数据库, 执行以下脚本, 创建`wolfroot`用户及`wolf`数据库(请根据需要修改用户名及密码):

```sql
CREATE USER wolfroot WITH PASSWORD '123456';
CREATE DATABASE wolf with owner=wolfroot ENCODING='UTF8';
GRANT ALL PRIVILEGES ON DATABASE wolf to wolfroot;
```

* 创建表

使用脚本创建数据库表

```sql
\i path/to/wolf/server/script/db-psql.sql;
```

查看创建的表:

```
\d
```

输出类似下面的结果, 表示数据库表创建成功:

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

* 安装MySQL

请自行google安装方法.

* 创建账号及数据库

以mysql账号登陆mysql数据库, 执行以下脚本, 创建`wolfroot`用户及`wolf`数据库(请根据需要修改用户名及密码):

```sql
create database `wolf` CHARACTER SET utf8mb4;
grant DELETE,EXECUTE,INSERT,SELECT,UPDATE
on wolf.* to wolfroot@'127.0.0.1' IDENTIFIED BY '123456';
grant DELETE,EXECUTE,INSERT,SELECT,UPDATE
on wolf.* to wolfroot@'localhost' IDENTIFIED BY '123456';
FLUSH PRIVILEGES;
use wolf;
```

* 创建表

使用脚本创建数据库表

```sql
source path/to/wolf/server/script/db-mysql.sql;
```

查看创建的表:

```
show tables;
```

输出类似下面的结果, 表示数据库表创建成功:

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

#### 2.服务器配置项

* 服务器主要配置参数有以下几个:

  * RBAC_ROOT_PASSWORD root账号及admin账号的默认密码. 默认为`123456`
  * RBAC_TOKEN_KEY 加密用户token使用的KEY, 强烈建议设置该值.
  * WOLF_CRYPT_KEY 加密应用Secret及OAuth2登陆用户ID使用的Key.
  * RBAC_TOKEN_EXPIRE_TIME `Agent` 登录接口返回的token的有效期, 默认为30天. 单位为秒.
  * CONSOLE_TOKEN_EXPIRE_TIME `Console` 登录接口返回的token的有效期, 默认为30天. 单位为秒.
  * RBAC_SQL_URL 连接数据库的数据库链接. 默认为: `postgres://wolfroot:123456@127.0.0.1:5432/wolf`
  * RBAC_REDIS_URL redis缓存的链接. 默认为: `redis://127.0.0.1:6379/0`

  以上三个配置, 可以在系统环境变量中配置, 也可以在启动时指定.

#### 3.启动服务器

请自行安装node及npm, 并设置合适的npm库镜像.

* 启动服务.

```shell
# 设置wolf的root及admin账号的初始密码.
export RBAC_ROOT_PASSWORD=123456
# 设置Token加密key, 为了系统安全, 强烈建议你设置该值.
export RBAC_TOKEN_KEY=THE-NEW-TOKEN-KEY
# 设置Secret加密key, 为了系统安全, 强烈建议你设置该值.
export WOLF_CRYPT_KEY=THE-NEW-CRYPT-KEY
# 请根据你创建用户及数据库的实际情况进行修改.
export RBAC_SQL_URL=postgres://wolfroot:123456@127.0.0.1:5432/wolf
# 请根据redis的实际配置进行修改.
export RBAC_REDIS_URL=redis://127.0.0.1:6379/0

cd path/to/wolf/server
# 安装依赖项(首次启动时执行)
npm install
# 启动服务程序.
npm run start
```

**如果启动成功, 应该能看到类似输出:**

> listen at 0.0.0.0:12180 success!
>
> 后面是一些初始化系统账号的输出信息

#### 4.启动Console

```shell
cd path/to/wolf/console
# 安装依赖项(首次启动时执行)
npm install
# 启动控制台程序.
cnpm run dev
```

**编译, 启动成功后, 应该能看到类似输出:**

```
 DONE  Compiled successfully in 1000ms    

  App running at:
  - Local:   http://localhost:12188/
  - Network: http://192.168.x.x:12188/
```

Console启动成功后, 可使用root账号进行访问了. 密码是`123456`或你在启动服务器时通过`RBAC_ROOT_PASSWORD`变量指定的.

[Console的使用, 请参考这里](./)

#### 5.配置Agent

注意: 如果你在使用 `apisix` 网关, 可以直接使用 `apisix` 的 [wolf-rbac](https://github.com/apache/apisix/blob/master/docs/zh/latest/plugins/wolf-rbac.md) 插件. 该插件也相当于`Agent`的角色.

* 安装OpenResty

请自行google安装方法.

- 在Console创建项目, 及相应的用户,角色, 权限, 资源等.

[参考这里](.)

* 在nginx.conf(或是它包含的子配置)中添加Agent代理配置(下面配置假定wolf的代码在`/opt`目录下)

```nginx
# 以下配置在http节点内.

lua_code_cache on;
client_max_body_size 5m;
client_body_buffer_size 256k;
lua_package_path "/opt/wolf/agent/lua/?.lua;;";

server {
    # 应用对外地址,端口. 如果需要配置域名, 也需要在这儿配置好.
    listen   12182;
    server_name localhost;

  	# 如果是restful接口, 需要定制配置没有权限时, 返回的json格式. 这里需要跟前端协调好.
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
    		# rbac server地址. 如果服务器不在本机, 请修改IP地址为实际地址.
        proxy_pass   http://127.0.0.1:12180;
    }

    # Clear the content-length of response
    header_filter_by_lua_file /opt/wolf/agent/lua/header_filter.lua;
    # filter, add infobar to the page
    body_filter_by_lua_file /opt/wolf/agent/lua/body_filter.lua;

    # proxy for application
    location / {
        # $appID，需要设置一个在Wolf-Server中已经配置的应用ID.
        set $appID appIDInWolfServer;
        # access check
        access_by_lua_file /opt/wolf/agent/lua/access_check.lua;

        #proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header REMOTE-HOST $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        # 需要进行权限访问控制的APP的真实地址及端口
        proxy_pass http://127.0.0.1:12184;
    }
}
```



#### 6.启动Agent(Nginx)

```
# 测试.
path/to/nginx/sbin/nginx -t
# 启动
path/to/nginx/sbin/nginx 
```

启动成功后, 可以通过地址: `http://127.0.0.1:12182` 访问应用. 这时应该是需要输入用户名及密码才能正常访问.