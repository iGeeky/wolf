[English](admin-api.md)

# 目录

- [目录](#目录)
  - [Protocol](#Protocol)
  - [Models](#Models)
  - [Console Login](#Login)
  - [Application](#API-Application)
  - [User](#API-User)
  - [Role](#API-role)
  - [Permission](#API-Permission)
  - [User-Role](#API-User-Role)
  - [Category](#API-Category)
  - [Resource](#API-Resource)
  - [AccessLog](#API-AccessLog)
  - [RBAC API For Wolf-Agent](#API-RBAC)
  - [OAuth2](./admin-api-oauth2.0-cn.md)


## Protocol

* Wolf接口采用`Restful`+`JSON`方式通讯.
* `POST`,`PUT`,`DELETE` 请求都使用 `Request Body` 传递参数, 格式都为Json.
* 请求及响应的 `Content-Type` 都为 `application/json`
* 响应体包含一个统一结构, 后面文档中, 不再列出整个结构, 只列出 `reason` 及 `data` 部分.

### 响应体通用结构示例:

```
{"ok": true, "reason": "错误代码", "errmsg": "错误信息", data: {成功时, 返回的数据}}
```

### 响应通用字段说明

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
ok | boolean | 是 | 服务状态
reason | string | 否 | 当 `ok=false` 时, `reason` 为错误码.
errmsg | string | 否 | 当 `ok=false` 时, `errmsg` 为错误信息提示.
data | object | 否 | 当 `ok=true` 时, `data` 为返回的信息.

### 系统包含以下通用错误码(reason):

  * `ERR_ARGS_ERROR` 请求参数错误, 响应码为`400`
  * `ERR_TOKEN_INVALID` TOKEN非法或缺失, 响应码为`401`
  * `ERR_ACCESS_DENIED` 没有权限执行操作, 响应码为`401`
  * `ERR_DUPLICATE_KEY_ERROR` 添加更新数据时重复了, 响应码为`400`
  * `ERR_SERVER_ERROR` 服务器错误, 响应码为`500`




## Models

### UserModels

#### UserInfo

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
id | integer | 是 | 用户ID
username | string | 是 | 用户名
nickname | string | 是 | 用户昵称
email | string | 否 | 用户email
appIDs | string[] | 否 | 用户关联的appID列表
manager | string | 是 | 管理角色, super: 超级管理员, admin: 普通管理员
createTime | integer | 是 | 创建时间

#### SimpleUserInfo

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
id | integer | 是 | 用户ID
username | string | 是 | 用户名
nickname | string | 是 | 用户昵称


### ApplicationModels

#### SimpleApplication

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
id | string | 是 | 应用ID
name | string | 是 | 应用名称
description | string | 否 | 应用描述
createTime | integer | 是 | 应用创建时间

#### Application

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
id | string | 是 | 应用ID
name | string | 是 | 应用名称
description | string | 否 | 应用描述
secret | string | 否 | 应用的secret, OAuth2登录时使用
redirectUris | string[] | 否 | OAuth2登录跳转地址.
accessTokenLifetime | integer | 否 | OAuth2的AccessToken存活时间, 单位是秒.
refreshTokenLifetime | integer | 否 | OAuth2的RefreshToken存储时间, 单位是秒.
createTime | integer | 是 | 应用创建时间
updateTime | integer | 是 | 应用修改时间


### RoleModels

#### Role

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
id | string | 是 | 角色ID
appID | string | 是 | 应用ID
name | string | 是 | 角色名称
description | string | 否 | 角色描述
permIDs | string[] | 否 | 角色拥有的权限列表
createTime | integer | 是 | 创建时间


### PermissionModels

#### Permission

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
id | string | 是 | 权限ID
appID | string | 是 | 应用ID
name | string | 是 | 权限名称
description | string | 否 | 权限描述
categoryID | integer | 否 | 权限的分类ID
createTime | integer | 是 | 创建时间


### CategoryModels

#### Category

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
id | string | 是 | 分类ID
appID | string | 是 | 应用ID
name | string | 是 | 分类名称
createTime | integer | 是 | 创建时间

### ResourceModels

#### Resource

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
id | string | 是 | 资源ID
appID | string | 是 | 应用ID
matchType | string | 是 | 资源匹配类型, equal: 完全匹配, suffix: 后缀匹配, prefix: 前缀匹配.
name | string | 是 | 资源名称, 当matchType为equal时, name为URL, 当matchType为suffix时, name为后缀值, 当matchType为prefix时, name为URL的前缀.
action | string | 是 | 资源的动作/操作, 通常是HTTP请求方法. 有以下可选值: ALL, GET, POST, PUT, DELETE, HEAD, OPTIONS, PATCH. 其中ALL表示可匹配所有HTTP方法.
priority | integer | 是 | 资源优先级.
permID | string | 是 | 访问该资源需要的权限
createTime | integer | 是 | 创建时间

### AccessLogModels

#### AccessLog

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
id | integer | 是 | 日志ID
appID | string | 是 | 应用ID
userID | string | 是 | 操作用户ID
username | string | 是 | 操作用户名
nickname | string | 是 | 操作用户昵称
action | string | 是 | 执行的操作(HTTP请求方法)
resName | string | 是 | 访问的URL
status | integer | 是 | 访问状态码
date | string | 是 | 访问日期, 格式为 yyyy-mm-dd
accessTime | integer | 是 | 访问时间, unix时间戳
ip | string | 是 | 访问者的IP


## Login

`Console` 登录接口, 只有 `super` 和 `admin` 的用户可登录.

管理后台大部分接口都需要使用Token进行操作, Token在使用管理员账号登录后获取. 需要Token的接口, token可通过请求头 `x-rbac-token` 来传递.

token过期时间默认为30天. 可通过环境变量 `CONSOLE_TOKEN_EXPIRE_TIME` 来修改, 单位是秒. 修改之后, 需要重启`Wolf-Server`


#### 请求方法: POST
#### 请求URL: /wolf/user/login
#### `Request Body`参数

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
username | string | 是 | 用户名
password | string | 是 | 密码

#### `Response Body` 响应

* data:

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
token | string | 是 | 用户登录token
userInfo | [UserInfo](#UserInfo) | 是 | 登录用户信息
applications | [SimpleApplication](#SimpleApplication)[] | 是 | 用户的应用列表.

* reason:
  * ERR_USER_NOT_FOUND 用户不存在
  * ERR_PASSWORD_ERROR 密码错误
  * ERR_USER_DISABLED 用户被禁用
  * ERR_ACCESS_DENIED 非管理员用户不能登录.

#### 示例

* 请求

```json
curl http://127.0.0.1:10080/wolf/user/login \
-H "Content-Type: application/json" \
-d '{ "username": "root", "password": "password"}'
```

* 响应

```json
{
  "ok": true,
  "reason": "",
  "data": {
    "token": "WOLF-TOKEN-ENCODE-BY-JWT",
    "userInfo": {
      "id": 1,
      "username": "root",
      "nickname": "root(super man)",
      "email": null,
      "appIDs": [
        "openresty"
      ],
      "manager": "super",
      "createTime": 1580486400
    },
    "applications": [
      {
        "id": "restful",
        "name": "restful测试",
        "description": "restful",
        "createTime": 1580486400
      }
    ]
  }
}
```

为方便执行后面的示例, 可将上面的 `token` 保存为shell环境下的一个变量: 
```shell
export WOLF_TOKEN="WOLF-TOKEN-ENCODE-BY-JWT"
```




## API-Application

### 添加应用

添加一个新的应用

#### 请求方法: POST
#### 请求URL: /wolf/application
#### `Header` 参数: 需要 [`Console`登录](#Login)的token, 通过 `x-rbac-token` 请求头传递.
#### `Request Body`参数

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
id | string | 是 | 应用ID, 必须唯一
name | string | 是 | 应用名称, 必须唯一
description | string | 否 | 应用说明
secret | string | 否 | 应用的secret, OAuth2登录时使用
redirectUris | string[] | 否 | OAuth2登录回调.
accessTokenLifetime | integer | 否 | OAuth2的AccessToken存活时间, 单位是秒, 如果为0, 使用系统默认设置: 7天.
refreshTokenLifetime | integer | 否 | OAuth2的RefreshToken存活时间, 单位是秒, 如果为0, 使用系统默认设置: 30天.

#### `Response Body` 响应

* data:

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
application | [Application](#Application) | 是 | 新添加的应用信息

#### 示例

* 请求

```json
curl http://127.0.0.1:10080/wolf/application \
-H "Content-Type: application/json" \
-H "x-rbac-token: $WOLF_TOKEN" \
-d '{
    "id": "test-app", "name": "application for test", "description": "description of application",
    "secret": "d41d8cd98f00b204e9800998ecf8427e",
    "redirectUris": ["http://127.0.0.1:10080/callback"],
    "accessTokenLifetime": 604801,
    "refreshTokenLifetime": 2592001
}'
```

* 响应

```json
{
  "ok": true,
  "reason": "",
  "data": {
    "application": {
      "id": "test-app",
      "name": "application for test",
      "description": "description of application",
      "redirectUris": [
        "http://127.0.0.1:10080/callback"
      ],
      "grants": null,
      "accessTokenLifetime": 604801,
      "refreshTokenLifetime": 2592001,
      "createTime": 1580486400,
      "updateTime": 1580486400
    }
  }
}
```

### 修改应用

修改应用信息

#### 请求方法: PUT
#### 请求URL: /wolf/application
#### `Header` 参数: 需要 [`Console`登录](#Login)的token, 通过 `x-rbac-token` 请求头传递.
#### `Request Body`参数

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
id | string | 是 | 应用ID, 必须唯一, 应用ID不能修改.
name | string | 是 | 应用名称, 必须唯一
description | string | 否 | 应用说明
secret | string | 否 | 应用的secret, OAuth2登录时使用
redirectUris | string[] | 否 | OAuth2登录回调.
accessTokenLifetime | integer | 否 | OAuth2的AccessToken存活时间, 单位是秒, 如果为0, 使用系统默认设置: 7天.
refreshTokenLifetime | integer | 否 | OAuth2的RefreshToken存储时间, 单位是秒, 如果为0, 使用系统默认设置: 30天.

#### `Response Body` 响应

* data:

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
application | [Application](#Application) | 是 | 修改后的应用信息

#### 示例

* 请求

```json
curl http://127.0.0.1:10080/wolf/application \
-H "Content-Type: application/json" \
-H "x-rbac-token: $WOLF_TOKEN" \
-X PUT \
-d '{
    "id": "test-app", "name": "test-application", "description": "description of application",
    "secret": "d41d8cd98f00b204e9800998ecf8427e",
    "redirectUris": ["http://127.0.0.1:10080/callback2"],
    "accessTokenLifetime": 604802,
    "refreshTokenLifetime": 2592002
}'
```

* 响应

```json
{
  "ok": true,
  "reason": "",
  "data": {
    "application": {
      "id": "test-app",
      "name": "test-application",
      "description": "description of application",
      "redirectUris": [
        "http://127.0.0.1:10080/callback2"
      ],
      "grants": null,
      "accessTokenLifetime": 604802,
      "refreshTokenLifetime": 2592002,
      "createTime": 1580486400,
      "updateTime": 1580486401
    }
  }
}
```

### 查询单个应用

查询一个应用信息

#### 请求方法: GET
#### 请求URL: /wolf/application/get
#### `Header` 参数: 需要 [`Console`登录](#Login)的token, 通过 `x-rbac-token` 请求头传递.
#### `Query`参数

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
id | string | 是 | 要查询的应用ID

#### `Response Body` 响应

* data:

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
application | [Application](#Application) | 是 | 查询的应用信息

* reason:
  * `ERR_OBJECT_NOT_FOUND` 查询的应用ID不存在.

#### 示例

* 请求

```json
curl "http://127.0.0.1:10080/wolf/application/get?id=test-app" \
-H "x-rbac-token: $WOLF_TOKEN"
```

* 响应

```json
{
  "ok": true,
  "reason": "",
  "data": {
    "application": {
      "id": "test-app",
      "name": "test-application",
      "description": "description of application",
      "redirectUris": [
        "http://127.0.0.1:10080/callback2"
      ],
      "grants": null,
      "accessTokenLifetime": 604802,
      "refreshTokenLifetime": 2592002,
      "createTime": 1580486400,
      "updateTime": 1580486401
    }
  }
}
```

### 查询应用Secret

查询一个应用的Secret

#### 请求方法: GET
#### 请求URL: /wolf/application/secret
#### `Header` 参数: 需要 [`Console`登录](#Login)的token, 通过 `x-rbac-token` 请求头传递.
#### `Query`参数

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
id | string | 是 | 要查询的应用ID

#### `Response Body` 响应

* data:

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
secret | string | 是 | 应用secret.

* reason:
  * `ERR_OBJECT_NOT_FOUND` 查询的应用ID不存在.

#### 示例

* 请求

```json
curl "http://127.0.0.1:10080/wolf/application/secret?id=test-app" \
-H "x-rbac-token: $WOLF_TOKEN"
```

* 响应

```json
{
  "ok": true,
  "reason": "",
  "data": {
    "secret": "d41d8cd98f00b204e9800998ecf8427e"
  }
}
```

### 应用列表查询

根据请求的参数, 查询应用列表信息

#### 请求方法: GET
#### 请求URL: /wolf/application/list
#### `Header` 参数: 需要 [`Console`登录](#Login)的token, 通过 `x-rbac-token` 请求头传递.
#### `Query`参数

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
key | string | 否 | 按ID或名称进行匹配查询
sort | string | 否 | 排序字段, 如: -id: 表示以id降序排序. +name: 表示以name升序排序.
page | integer | 否 | 页码, 从1开始递增, 默认为1
limit | integer | 否 | 页大小, 默认为10

#### `Response Body` 响应

* data:

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
applications | [Application](#Application)[] | 是 | 用户的应用列表.
total | integer | 是 | 总记录数

#### 示例

* 请求

```json
curl http://127.0.0.1:10080/wolf/application/list \
-H "x-rbac-token: $WOLF_TOKEN"
```

* 响应

```json
{
  "ok": true,
  "reason": "",
  "data": {
    "applications": [
     {
        "id": "restful",
        "name": "restful测试",
        "description": "restful",
        "redirectUris": [
          "http://localhost:10080/wolf/oauth2/client_app"
        ],
        "grants": null,
        "accessTokenLifetime": 3600,
        "refreshTokenLifetime": 2592000,
        "createTime": 1578817535,
        "updateTime": 1587375156
      },
      ...
    ],
    "total": 6
  }
}
```


### 所有应用列表

查询所有应用, 不分页.

#### 请求方法: GET
#### 请求URL: /wolf/application/list_all
#### `Header` 参数: 需要 [`Console`登录](#Login)的token, 通过 `x-rbac-token` 请求头传递.
#### `Query`参数

无

#### `Response Body` 响应

* data:

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
applications | [Application](#Application)[] | 是 | 用户的应用列表.
total | integer | 是 | 总记录数

#### 示例

* 请求

```json
curl http://127.0.0.1:10080/wolf/application/list_all \
-H "x-rbac-token: $WOLF_TOKEN"
```

* 响应

```json
{
  "ok": true,
  "reason": "",
  "data": {
    "applications": [
     {
        "id": "restful",
        "name": "restful测试",
        "description": "restful",
        "redirectUris": [
          "http://localhost:10080/wolf/oauth2/client_app"
        ],
        "grants": null,
        "accessTokenLifetime": 3600,
        "refreshTokenLifetime": 2592000,
        "createTime": 1578817535,
        "updateTime": 1587375156
      },
      ...
    ],
    "total": 6
  }
}
```

### 删除应用

删除一个应用

#### 请求方法: DELETE
#### 请求URL: /wolf/application
#### `Header` 参数: 需要 [`Console`登录](#Login)的token, 通过 `x-rbac-token` 请求头传递.
#### `Request Body`参数

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
id | string | 是 | 要删除的应用ID

#### `Response Body` 响应

* data:

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
count | integer | 是 | 删除数量, 通常是1.

* reason:
  * `ERR_OBJECT_NOT_FOUND` 要删除的应用不存在

#### 示例

* 请求

```json
curl http://127.0.0.1:10080/wolf/application \
-H "Content-Type: application/json" \
-H "x-rbac-token: $WOLF_TOKEN" \
-X DELETE \
-d '{
    "id": "test-app"
}'
```

* 响应

```json
{
  "ok": true,
  "reason": "",
  "data": {
    "count": 1
  }
}
```


## API-User

### 添加用户

添加一个新的用户

#### 请求方法: POST
#### 请求URL: /wolf/user
#### `Header` 参数: 需要 [`Console`登录](#Login)的token, 通过 `x-rbac-token` 请求头传递.
#### `Request Body`参数

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
username | string | 是 | 用户名称, 登录系统时使用, 需要是`字母+数字+下划线`组成, 必须唯一.
nickname | string | 是 | 用户昵称
password | string | 否 | 用户密码, 如果为空, 将由服务生成一个随机值.
email | string | 否 | 用户的email.(未用到)
tel | string | 否 | 用户的手机号
appIDs | string[] | 否 | 用户管理的有权限的appID列表.
manager | string | 否 | 管理权限, super: 超级管理员, 具有所有权限, admin: 具有基本管理权限(不可对应用和用户进行添加,修改,删除接口).
status | integer | 否 | 用户状态, 0: 正常状态, -1: 禁用状态.

#### `Response Body` 响应

* data:

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
userInfo | [UserInfo](#UserInfo) | 是 | 新添加的用户信息
password | string | 是 | 新添加的用户的密码

#### 示例

* 请求

```json
curl http://127.0.0.1:10080/wolf/user \
-H "Content-Type: application/json" \
-H "x-rbac-token: $WOLF_TOKEN" \
-d '{
    "username": "test-user",
    "nickname": "user for test",
    "password": "abc#123",
    "email": "test-user@test.com",
    "tel": "123456",
    "appIDs": ["restful"],
    "manager": "none",
    "status": 0
}'
```

* 响应

```json
{
  "ok": true,
  "reason": "",
  "data": {
    "password": "abc#123",
    "userInfo": {
      "id": 1024,
      "username": "test-user",
      "nickname": "user for test",
      "email": "test-user@test.com",
      "appIDs": [
        "restful"
      ],
      "manager": "none",
      "createTime": 1588576578
    }
  }
```

### 修改用户

修改用户信息

#### 请求方法: PUT
#### 请求URL: /wolf/user
#### `Header` 参数: 需要 [`Console`登录](#Login)的token, 通过 `x-rbac-token` 请求头传递.
#### `Request Body`参数

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
id | integer | 是 | 用户ID, 要修改的用户ID
username | string | 是 | 用户名称, 登录系统时使用, 需要是`字母+数字+下划线`组成必须唯一.
nickname | string | 是 | 用户昵称
email | string | 否 | 用户的email.(未用到)
tel | string | 否 | 用户的手机号
appIDs | string[] | 否 | 用户管理/有权限的appID列表.
manager | string | 否 | 管理权限, super: 超级管理员, 具有所有权限, admin: 具有基本管理权限(不可对应用和用户进行添加,修改,删除接口).
status | integer | 否 | 用户状态, 0: 正常状态, -1: 禁用状态.

#### `Response Body` 响应

* data:

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
userInfo | [UserInfo](#UserInfo) | 是 | 修改后的用户信息

* reason:
  * `ERR_USER_NOT_FOUND` 要修改的用户ID不存在

#### 示例

* 请求

```json
curl http://127.0.0.1:10080/wolf/user \
-H "Content-Type: application/json" \
-H "x-rbac-token: $WOLF_TOKEN" \
-X PUT \
-d '{
    "id": 1024,
    "username": "test-user",
    "nickname": "nickname for test",
    "email": "test-user@test.com",
    "tel": "123456",
    "appIDs": ["restful"],
    "manager": "none",
    "status": 0
}'
```

* 响应

```json
{
  "ok": true,
  "reason": "",
  "data": {
    "effects": 1,
    "userInfo": {
      "id": 1024,
      "username": "test-user",
      "nickname": "nickname for test",
      "email": "test-user@test.com",
      "appIDs": [
        "restful"
      ],
      "manager": "none",
      "createTime": 1588576578
    }
  }
}
```

### 查询当前用户信息

查询指定token的用户信息

#### 请求方法: GET
#### 请求URL: /wolf/user/info
#### `Header` 参数: 需要 [`Console`登录](#Login)的token, 通过 `x-rbac-token` 请求头传递.
#### `Query`参数

无

#### `Response Body` 响应

* data:

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
userInfo | [UserInfo](#UserInfo) | 是 | 修改后的用户信息
applications | [SimpleApplication](#SimpleApplication)[] | 否 | 用户关联的应用列表.

#### 示例

* 请求

```json
curl "http://127.0.0.1:10080/wolf/user/info" \
-H "x-rbac-token: $WOLF_TOKEN"
```

* 响应

```json

  "ok": true,
  "reason": "",
  "data": {
    "userInfo": {
      "id": 696,
      "username": "root",
      "nickname": "root(super man)",
      "email": null,
      "appIDs": [
        "openresty"
      ],
      "manager": "super",
      "createTime": 1578401859
    },
    "applications": [
      {
        "id": "restful",
        "name": "restful测试",
        "description": "restful",
        "createTime": 1578817535
      },
      ...
    ]
  }
}
```

### 用户列表查询

根据请求的参数, 查询用户列表信息

#### 请求方法: GET
#### 请求URL: /wolf/user/list
#### `Header` 参数: 需要 [`Console`登录](#Login)的token, 通过 `x-rbac-token` 请求头传递.
#### `Query`参数

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
key | string | 否 | 搜索username,nickname,tel字段.
sort | string | 否 | 排序字段, 如: -id: 表示以id降序排序. +name: 表示以name升序排序.
page | integer | 否 | 页码, 从1开始递增, 默认为1
limit | integer | 否 | 页大小, 默认为10

#### `Response Body` 响应

* data:

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
userInfos | [UserInfo](#UserInfo)[] | 是 | 用户列表.
total | integer | 是 | 总记录数

#### 示例

* 请求

```json
curl http://127.0.0.1:10080/wolf/user/list \
-H "x-rbac-token: $WOLF_TOKEN"
```

* 响应

```json
{
  "ok": true,
  "reason": "",
  "data": {
    "userInfos": [
     {
        "id": 697,
        "username": "admin",
        "nickname": "administrator",
        "email": null,
        "appIDs": [
          "openresty",
          "restful"
        ],
        "manager": "admin",
        "createTime": 1578401859
      },
      ...
    ],
    "total": 6
  }
}
```


### 重置用户密码

重置用户的密码

#### 请求方法: PUT
#### 请求URL: /wolf/user/reset_pwd
#### `Header` 参数: 需要 [`Console`登录](#Login)的token, 通过 `x-rbac-token` 请求头传递.
#### `Request Body`参数

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
id | integer | 是 | 要重置密码的用户ID

#### `Response Body` 响应

* data:

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
password | string | 是 | 重置后的密码

* reason:
  * `ERR_USER_NOT_FOUND` 要删除的用户不存在
  * `ERR_ACCESS_DENIED` 只能超级管理员能执行此操作

#### 示例

* 请求

```json
curl http://127.0.0.1:10080/wolf/user/reset_pwd \
-H "Content-Type: application/json" \
-H "x-rbac-token: $WOLF_TOKEN" \
-X PUT \
-d '{
    "id": 696
}'
```

* 响应

```json
{
  "ok": true,
  "reason": "",
  "data": {
    "password": "197TLR0dPVdm"
  }
}
```


### 删除用户

删除一个用户

#### 请求方法: DELETE
#### 请求URL: /wolf/user
#### `Header` 参数: 需要 [`Console`登录](#Login)的token, 通过 `x-rbac-token` 请求头传递.
#### `Request Body`参数

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
id | integer | 是 | 要删除的用户ID

#### `Response Body` 响应

* data:

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
userInfo | [UserInfo](#UserInfo) | 是 | 删除的用户信息
count | integer | 是 | 删除数量, 通常是1.

* reason:
  * `ERR_USER_NOT_FOUND` 要删除的用户不存在
  * `ERR_PERMISSION_DENY` 不能删除super账号
  * `ERR_ACCESS_DENIED` 只能超级管理员能执行此操作

#### 示例

* 请求

```json
curl http://127.0.0.1:10080/wolf/user \
-H "Content-Type: application/json" \
-H "x-rbac-token: $WOLF_TOKEN" \
-X DELETE \
-d '{
    "id": 2756
}'
```

* 响应

```json
{
  "ok": true,
  "reason": "",
  "data": {
    "count": 1
  }
}
```

## API-Role

### 添加角色

添加一个新的角色

#### 请求方法: POST
#### 请求URL: /wolf/role
#### `Header` 参数: 需要 [`Console`登录](#Login)的token, 通过 `x-rbac-token` 请求头传递.
#### `Request Body`参数

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
appID | string | 是 | 应用ID, 角色是只能属于某一个应用的.
id | string | 是 | 角色ID, 必须应用内唯一
name | string | 是 | 角色名称, 必须应用内唯一
description | string | 否 | 角色说明
permIDs | string[] | 否 | 角色对应的权限ID列表.

#### `Response Body` 响应

* data:

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
role | [Role](#Role) | 是 | 新添加的角色信息

#### 示例

* 请求

```json
curl http://127.0.0.1:10080/wolf/role \
-H "Content-Type: application/json" \
-H "x-rbac-token: $WOLF_TOKEN" \
-d '{
    "id": "test-role",
    "appID": "restful",
    "name": "role for test",
    "description": "description of role",
    "permIDs": ["PERM_XXX"]
}'
```

* 响应

```json
{
  "ok": true,
  "reason": "",
  "data": {
    "role": {
      "id": "test-role",
      "appID": "restful",
      "name": "role for test",
      "description": "description of role",
      "permIDs": [
        "PERM_XXX"
      ],
      "createTime": 1588583707
    }
  }
}
```

### 修改角色

修改角色信息

#### 请求方法: PUT
#### 请求URL: /wolf/role
#### `Header` 参数: 需要 [`Console`登录](#Login)的token, 通过 `x-rbac-token` 请求头传递.
#### `Request Body`参数

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
appID | string | 是 | 应用ID, 不能修改
id | string | 是 | 角色ID, 不能修改
name | string | 是 | 角色名称, 必须应用内唯一
description | string | 否 | 角色说明
permIDs | string[] | 否 | 角色对应的权限ID列表.

#### `Response Body` 响应

* data:

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
role | [Role](#Role) | 是 | 修改后的角色信息

#### 示例

* 请求

```json
curl http://127.0.0.1:10080/wolf/role \
-H "Content-Type: application/json" \
-H "x-rbac-token: $WOLF_TOKEN" \
-X PUT \
-d '{
    "id": "test-role",
    "appID": "restful",
    "name": "role for test",
    "description": "description of role",
    "permIDs": ["PERM_YYY"]
}'
```

* 响应

```json
{
  "ok": true,
  "reason": "",
  "data": {
    "role": {
      "id": "test-role",
      "appID": "restful",
      "name": "role for test",
      "description": "description of role",
      "permIDs": [
        "PERM_YYY"
      ],
      "createTime": 1588583707
    }
  }
}
```


### 角色列表查询

根据请求的参数, 查询角色列表信息

#### 请求方法: GET
#### 请求URL: /wolf/role/list
#### `Header` 参数: 需要 [`Console`登录](#Login)的token, 通过 `x-rbac-token` 请求头传递.
#### `Query`参数

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
appID | string | 是 | 应用ID
key | string | 否 | 按ID或名称进行匹配查询
sort | string | 否 | 排序字段, 如: -id: 表示以id降序排序. +name: 表示以name升序排序.
page | integer | 否 | 页码, 从1开始递增, 默认为1
limit | integer | 否 | 页大小, 默认为10

#### `Response Body` 响应

* data:

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
roles | [Role](#Role)[] | 是 | 角色列表.
total | integer | 是 | 总记录数

#### 示例

* 请求

```json
curl http://127.0.0.1:10080/wolf/role/list?appID=restful \
-H "x-rbac-token: $WOLF_TOKEN"
```

* 响应

```json
{
  "ok": true,
  "reason": "",
  "data": {
    "roles": [
      {
        "id": "test-role",
        "name": "role for test",
        "description": "description of role",
        "appID": "restful",
        "permIDs": [
          "PERM_YYY"
        ],
        "createTime": 1588583707,
        "updateTime": 1588586200
      },
      ...
    ],
    "total": 5
  }
}
```


### 删除角色

删除一个角色

#### 请求方法: DELETE
#### 请求URL: /wolf/role
#### `Header` 参数: 需要 [`Console`登录](#Login)的token, 通过 `x-rbac-token` 请求头传递.
#### `Request Body`参数

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
appID | string | 是 | 应用ID
id | string | 是 | 要删除的角色ID

#### `Response Body` 响应

* data:

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
count | integer | 是 | 删除数量, 通常是1.

#### 示例

* 请求

```json
curl http://127.0.0.1:10080/wolf/role \
-H "Content-Type: application/json" \
-H "x-rbac-token: $WOLF_TOKEN" \
-X DELETE \
-d '{
    "id": "test-role",
    "appID": "restful"
}'
```

* 响应

```json
{
  "ok": true,
  "reason": "",
  "data": {
    "count": 1
  }
}
```


## API-Permission

### 添加权限

添加一个新的权限

#### 请求方法: POST
#### 请求URL: /wolf/permission
#### `Header` 参数: 需要 [`Console`登录](#Login)的token, 通过 `x-rbac-token` 请求头传递.
#### `Request Body`参数

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
appID | string | 是 | 应用ID, 权限是只能属于某一个应用的.
id | string | 是 | 权限ID, 必须应用内唯一
name | string | 是 | 权限名称, 必须应用内唯一
description | string | 否 | 权限说明
categoryID | integer | 否 | 权限对应的分类ID

#### `Response Body` 响应

* data:

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
permission | [Permission](#Permission) | 是 | 新添加的权限信息

#### 示例

* 请求

```json
curl http://127.0.0.1:10080/wolf/permission \
-H "Content-Type: application/json" \
-H "x-rbac-token: $WOLF_TOKEN" \
-d '{
    "id": "test-permission",
    "appID": "restful",
    "name": "permission for test",
    "description": "description of permission",
    "categoryID": 1
}'
```

* 响应

```json
{
  "ok": true,
  "reason": "",
  "data": {
    "permission": {
      "id": "test-permission",
      "appID": "restful",
      "name": "permission for test",
      "description": "description of permission",
      "categoryID": 1,
      "createTime": 1588658062
    }
  }
}
```

### 修改权限

修改权限信息

#### 请求方法: PUT
#### 请求URL: /wolf/permission
#### `Header` 参数: 需要 [`Console`登录](#Login)的token, 通过 `x-rbac-token` 请求头传递.
#### `Request Body`参数

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
appID | string | 是 | 应用ID, 不能修改
id | string | 是 | 权限ID, 不能修改
name | string | 是 | 权限名称, 必须应用内唯一
description | string | 否 | 权限说明
categoryID | integer | 否 | 权限对应的分类ID

#### `Response Body` 响应

* data:

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
permission | [Permission](#Permission) | 是 | 修改后的权限信息

#### 示例

* 请求

```json
curl http://127.0.0.1:10080/wolf/permission \
-H "Content-Type: application/json" \
-H "x-rbac-token: $WOLF_TOKEN" \
-X PUT \
-d '{
    "id": "test-permission",
    "appID": "restful",
    "name": "permission for test2",
    "description": "description of permission2",
    "categoryID": 2
}'
```

* 响应

```json
{
  "ok": true,
  "reason": "",
  "data": {
    "permission": {
      "id": "test-permission",
      "appID": "restful",
      "name": "permission for test2",
      "description": "description of permission2",
      "createTime": 1588658062
    }
  }
}
```


### 权限列表查询

根据请求的参数, 查询权限列表信息

#### 请求方法: GET
#### 请求URL: /wolf/permission/list
#### `Header` 参数: 需要 [`Console`登录](#Login)的token, 通过 `x-rbac-token` 请求头传递.
#### `Query`参数

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
appID | string | 是 | 应用ID
key | string | 否 | 按ID或名称进行匹配查询
sort | string | 否 | 排序字段, 如: -id: 表示以id降序排序. +name: 表示以name升序排序.
page | integer | 否 | 页码, 从1开始递增, 默认为1
limit | integer | 否 | 页大小, 默认为10

#### `Response Body` 响应

* data:

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
permissions | [Permission](#Permission)[] | 是 | 权限列表.
total | integer | 是 | 总记录数

#### 示例

* 请求

```json
curl http://127.0.0.1:10080/wolf/permission/list?appID=restful \
-H "x-rbac-token: $WOLF_TOKEN"
```

* 响应

```json

  "ok": true,
  "reason": "",
  "data": {
    "permissions": [
      {
        "id": "test-permission",
        "appID": "restful",
        "name": "permission for test2",
        "description": "description of permission2",
        "categoryID": 2,
        "createTime": 1588658062,
        "updateTime": 1588658246,
        "category_id": 2,
        "category": null
      },
      ...
    ],
    "total": 2
  }
}
```


### 删除权限

删除一个权限

#### 请求方法: DELETE
#### 请求URL: /wolf/permission
#### `Header` 参数: 需要 [`Console`登录](#Login)的token, 通过 `x-rbac-token` 请求头传递.
#### `Request Body`参数

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
appID | string | 是 | 应用ID
id | string | 是 | 要删除的权限ID

#### `Response Body` 响应

* data:

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
count | integer | 是 | 删除数量, 通常是1.

* reason
  * `ERR_ACCESS_DENIED` 要删除的权限正在被使用, 无法删除.

#### 示例

* 请求

```json
curl http://127.0.0.1:10080/wolf/permission \
-H "Content-Type: application/json" \
-H "x-rbac-token: $WOLF_TOKEN" \
-X DELETE \
-d '{
    "id": "test-permission",
    "appID": "restful"
}'
```

* 响应

```json
{
  "ok": true,
  "reason": "",
  "data": {
    "count": 1
  }
}
```

## API-User-Role

用户角色相关操作都只能作用于一个应用. 所以相关接口都需要传递 `userID` 及 `appID` 参数.

### Get User Roles

查询用户的角色及权限信息

#### 请求方法: GET
#### 请求URL: /wolf/user-role
#### `Header` 参数: 需要 [`Console`登录](#Login)的token, 通过 `x-rbac-token` 请求头传递.
#### `Query`参数

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
userID | integer | Yes | 需要查询角色与权限的UserID
appID | string | Yes | 需要查询角色与权限的应用ID.


#### 示例

* 请求

```json
curl "http://127.0.0.1:10080/wolf/user-role?userID=1&appID=restful" \
-H "Content-Type: application/json" \
-H "x-rbac-token: $WOLF_TOKEN"
```

* 响应

```json
{
  "ok": true,
  "reason": "",
  "data": {
    "userRole": {
      "userID": 1,
      "appID": "restful",
      "permIDs": [
        "RESTFUL_INDEX"
      ],
      "roleIDs": [
        "application"
      ],
      "createTime": 1609055508
    }
  }
}
```

### Set User Roles

设置用户角色与权限

#### 请求方法: POST
#### 请求URL: /wolf/user-role/set
#### `Header` 参数: 需要 [`Console`登录](#Login)的token, 通过 `x-rbac-token` 请求头传递.
#### `Request Body`参数


字段 | 类型 | 必填项 |说明
-------|-------|------|-----
userID | integer | Yes | 需要设置角色与权限的UserID
appID | string | Yes | 需要设置角色与权限的应用ID.
permIDs | string[] | Yes | 要设置的权限列表
roleIDs | string[] | Yes | 要设置的角色列表

#### 示例

* 请求

```json
curl http://127.0.0.1:10080/wolf/user-role/set \
-H "Content-Type: application/json" \
-H "x-rbac-token: $WOLF_TOKEN" \
-d '{
    "userID": 1,
    "appID": "restful",
    "permIDs": ["RESTFUL_INDEX"],
    "roleIDs": ["application"]
}'
```

* 响应

```json
{
  "ok": true,
  "reason": "",
  "data": {
    "userRole": {
      "userID": 1,
      "appID": "restful",
      "permIDs": [
        "RESTFUL_INDEX"
      ],
      "roleIDs": [
        "application"
      ],
      "createTime": 1609054766
    }
  }
}
```

### Clear User Roles

清除用户的某个应用的角色及权限.

#### 请求方法: DELETE
#### 请求URL: /wolf/user-role
#### `Header` 参数: 需要 [`Console`登录](#Login)的token, 通过 `x-rbac-token` 请求头传递.
#### `Request Body` 参数

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
userID | integer | Yes | 需要清除角色与权限的UserID
appID | string | Yes | 需要清除角色与权限的应用ID.

#### 示例

* 请求

```json
curl http://127.0.0.1:10080/wolf/user-role \
-H "Content-Type: application/json" \
-H "x-rbac-token: $WOLF_TOKEN" \
-X DELETE \
-d '{
    "userID": 1,
    "appID": "restful"
}'
```

* 响应

```json
{
  "ok": true,
  "reason": "",
  "data": {
    "count": 1
  }
}
```

## API-Category

### 添加分类

添加一个新的分类

#### 请求方法: POST
#### 请求URL: /wolf/category
#### `Header` 参数: 需要 [`Console`登录](#Login)的token, 通过 `x-rbac-token` 请求头传递.
#### `Request Body`参数

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
appID | string | 是 | 应用ID, 分类是只能属于某一个应用的.
name | string | 是 | 分类名称, 必须应用内唯一


#### `Response Body` 响应

* data:

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
category | [Category](#Category) | 是 | 新添加的分类信息

#### 示例

* 请求

```json
curl http://127.0.0.1:10080/wolf/category \
-H "Content-Type: application/json" \
-H "x-rbac-token: $WOLF_TOKEN" \
-d '{
    "appID": "restful",
    "name": "category for test"
}'
```

* 响应

```json
{
  "ok": true,
  "reason": "",
  "data": {
    "category": {
      "id": 744,
      "appID": "restful",
      "name": "category for test",
      "createTime": 1588659229
    }
  }
}
```

### 修改分类

修改一个分类

#### 请求方法: PUT
#### 请求URL: /wolf/category
#### `Header` 参数: 需要 [`Console`登录](#Login)的token, 通过 `x-rbac-token` 请求头传递.
#### `Request Body`参数

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
id | integer | 是 | 分类ID, 不能修改
name | string | 是 | 分类名称, 必须应用内唯一


#### `Response Body` 响应

* data:

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
category | [Category](#Category) | 是 | 修改后的分类信息

#### 示例

* 请求

```json
curl http://127.0.0.1:10080/wolf/category \
-H "Content-Type: application/json" \
-H "x-rbac-token: $WOLF_TOKEN" \
-X PUT \
-d '{
    "id": 744,
    "name": "category for test2"
}'
```

* 响应

```json
{
  "ok": true,
  "reason": "",
  "data": {
    "category": {
      "id": 744,
      "appID": "restful",
      "name": "category for test2",
      "createTime": 1588659229
    }
  }
}
```


### 分类列表查询

根据请求的参数, 查询分类列表信息

#### 请求方法: GET
#### 请求URL: /wolf/category/list
#### `Header` 参数: 需要 [`Console`登录](#Login)的token, 通过 `x-rbac-token` 请求头传递.
#### `Query`参数

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
appID | string | 是 | 应用ID
key | string | 否 | 按名称进行匹配查询
sort | string | 否 | 排序字段, 如: -id: 表示以id降序排序. +name: 表示以name升序排序.
page | integer | 否 | 页码, 从1开始递增, 默认为1
limit | integer | 否 | 页大小, 默认为10

#### `Response Body` 响应

* data:

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
categorys | [Category](#Category)[] | 是 | 分类列表.
total | integer | 是 | 总记录数

#### 示例

* 请求

```json
curl http://127.0.0.1:10080/wolf/category/list?appID=restful \
-H "x-rbac-token: $WOLF_TOKEN"
```

* 响应

```json
{
  "ok": true,
  "reason": "",
  "data": {
    "categorys": [
      {
        "id": 744,
        "appID": "restful",
        "name": "category for test2",
        "createTime": 1588659229,
        "updateTime": 1588659461
      }
    ],
    "total": 1
  }
}
```


### 删除分类

删除一个分类

#### 请求方法: DELETE
#### 请求URL: /wolf/category
#### `Header` 参数: 需要 [`Console`登录](#Login)的token, 通过 `x-rbac-token` 请求头传递.
#### `Request Body`参数

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
id | string | 是 | 要删除的分类ID

#### `Response Body` 响应

* data:

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
count | integer | 是 | 删除数量, 通常是1.

#### 示例

* 请求

```json
curl http://127.0.0.1:10080/wolf/category \
-H "Content-Type: application/json" \
-H "x-rbac-token: $WOLF_TOKEN" \
-X DELETE \
-d '{
    "id": 744
}'
```

* 响应

```json
{
  "ok": true,
  "reason": "",
  "data": {
    "count": 1
  }
}
```

## API-Resource

### 添加资源

添加一个新的资源

#### 请求方法: POST
#### 请求URL: /wolf/resource
#### `Header` 参数: 需要 [`Console`登录](#Login)的token, 通过 `x-rbac-token` 请求头传递.
#### `Request Body`参数

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
appID | string | 是 | 应用ID, 资源是只能属于某一个应用的.
matchType | string | 是 | 资源匹配类型, equal: 完全匹配, suffix: 后缀匹配, prefix: 前缀匹配.
name | string | 是 | 资源名称, 当matchType为equal时, name为URL, 当matchType为suffix时, name为后缀值, 当matchType为prefix时, name为URL的前缀.
action | string | 否 | 资源的动作/操作, 通常是HTTP请求方法. 有以下可选值: ALL, GET, POST, PUT, DELETE, HEAD, OPTIONS, PATCH. 其中ALL表示可匹配所有HTTP方法.
permID | string | 否 | 访问该资源需要的权限.

#### `Response Body` 响应

* data:

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
resource | [Resource](#Resource) | 是 | 新添加的资源信息

#### 示例

* 请求

```json
curl http://127.0.0.1:10080/wolf/resource \
-H "Content-Type: application/json" \
-H "x-rbac-token: $WOLF_TOKEN" \
-d '{
    "appID": "restful",
    "matchType": "equal",
    "name": "/path/to/resource",
    "action": "GET",
    "permID": "PERM_XXX"
}'
```

* 响应

```json
{
  "ok": true,
  "reason": "",
  "data": {
    "resource": {
      "id": 8512,
      "appID": "restful",
      "matchType": "equal",
      "name": "/path/to/resource",
      "priority": 10483,
      "action": "GET",
      "permID": "PERM_XXX",
      "createTime": 1588660594
    }
  }
}
```

### 修改资源

修改一个资源

#### 请求方法: PUT
#### 请求URL: /wolf/resource
#### `Header` 参数: 需要 [`Console`登录](#Login)的token, 通过 `x-rbac-token` 请求头传递.
#### `Request Body`参数

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
id | string | 是 | 资源ID, 不能修改
matchType | string | 是 | 资源匹配类型, equal: 完全匹配, suffix: 后缀匹配, prefix: 前缀匹配.
name | string | 是 | 资源名称, 当matchType为equal时, name为URL, 当matchType为suffix时, name为后缀值, 当matchType为prefix时, name为URL的前缀.
action | string | 否 | 资源的动作/操作, 通常是HTTP请求方法. 有以下可选值: ALL, GET, POST, PUT, DELETE, HEAD, OPTIONS, PATCH. 其中ALL表示可匹配所有HTTP方法.
permID | string | 否 | 访问该资源需要的权限.

#### `Response Body` 响应

* data:

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
resource | [Resource](#Resource) | 是 | 修改后的资源信息

#### 示例

* 请求

```json
curl http://127.0.0.1:10080/wolf/resource \
-H "Content-Type: application/json" \
-H "x-rbac-token: $WOLF_TOKEN" \
-X PUT \
-d '{
   "id": 8512,
    "matchType": "equal",
    "name": "/path/to/resource",
    "action": "ALL",
    "permID": "PERM_YYY"
}'
```

* 响应

```json
{
  "ok": true,
  "reason": "",
  "data": {
    "resource": {
      "id": 8512,
      "appID": "restful",
      "matchType": "equal",
      "name": "/path/to/resource",
      "priority": 11483,
      "action": "ALL",
      "permID": "PERM_YYY",
      "createTime": 1588660594
    }
  }
}
```


### 资源列表查询

根据请求的参数, 查询资源列表信息

#### 请求方法: GET
#### 请求URL: /wolf/resource/list
#### `Header` 参数: 需要 [`Console`登录](#Login)的token, 通过 `x-rbac-token` 请求头传递.
#### `Query`参数

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
appID | string | 是 | 应用ID
key | string | 否 | 按资源名称或访问权限进行匹配查询
sort | string | 否 | 排序字段, 如: -id: 表示以id降序排序. +name: 表示以name升序排序.
page | integer | 否 | 页码, 从1开始递增, 默认为1
limit | integer | 否 | 页大小, 默认为10

#### `Response Body` 响应

* data:

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
resources | [Resource](#Resource)[] | 是 | 资源列表.
total | integer | 是 | 总记录数

#### 示例

* 请求

```json
curl http://127.0.0.1:10080/wolf/resource/list?appID=restful \
-H "x-rbac-token: $WOLF_TOKEN"
```

* 响应

```json
{
  "ok": true,
  "reason": "",
  "data": {
    "resources": [
      {
        "id": 8512,
        "appID": "restful",
        "matchType": "equal",
        "name": "/path/to/resource",
        "priority": 11483,
        "action": "ALL",
        "permID": "PERM_YYY",
        "createTime": 1588660594
      },
      ...
    ],
    "total": 3
  }
}
```


### 删除资源

删除一个资源

#### 请求方法: DELETE
#### 请求URL: /wolf/resource
#### `Header` 参数: 需要 [`Console`登录](#Login)的token, 通过 `x-rbac-token` 请求头传递.
#### `Request Body`参数

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
id | integer | 是 | 要删除的资源ID

#### `Response Body` 响应

* data:

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
count | integer | 是 | 删除数量, 通常是1.

#### 示例

* 请求

```json
curl http://127.0.0.1:10080/wolf/resource \
-H "Content-Type: application/json" \
-H "x-rbac-token: $WOLF_TOKEN" \
-X DELETE \
-d '{
    "id": 8512
}'
```

* 响应

```json
{
  "ok": true,
  "reason": "",
  "data": {
    "count": 1
  }
}
```

## API-AccessLog

### 访问日志列表查询

根据请求的参数, 查询访问日志列表信息

#### 请求方法: GET
#### 请求URL: /wolf/access-log/list
#### `Header` 参数: 需要 [`Console`登录](#Login)的token, 通过 `x-rbac-token` 请求头传递.
#### `Query`参数

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
appID | string | 是 | 应用ID
username | string | 否 | 按用户名或用户昵称进行匹配查询
action | string | 否 | 资源动作
resName | string | 否 | 资源名称
ip | string | 否 | 操作该资源的用户的IP
status | integer | 否 | 资源操作HTTP状态码
startTime | integer | 否 | 访问时间-开始时间
endTime | integer | 否 | 访问时间-结束时间
sort | string | 否 | 排序字段, 如: -id: 表示以id降序排序. +name: 表示以name升序排序.
page | integer | 否 | 页码, 从1开始递增, 默认为1
limit | integer | 否 | 页大小, 默认为10


#### `Response Body` 响应

* data:

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
accessLogs | [AccessLog](#AccessLog)[] | 是 | 访问日志列表.
total | integer | 是 | 总记录数

#### 示例

* 请求

```json
curl http://127.0.0.1:10080/wolf/access-log/list?appID=restful \
-H "x-rbac-token: $WOLF_TOKEN"
```

* 响应

```json
{
  "ok": true,
  "reason": "",
  "data": {
    "accessLogs": [
      {
        "id": 27999,
        "appID": "restful",
        "userID": "749",
        "username": "test",
        "nickname": "test",
        "action": "GET",
        "resName": "/",
        "matchedResource": {},
        "status": 401,
        "body": {},
        "contentType": null,
        "date": "2020-02-27",
        "accessTime": 1582816829,
        "ip": "127.0.0.1"
      },
      ...
    ],
    "total": 5
  }
}
```


## API-RBAC

所有以 `/wolf/rbac` 开头的接口, 都是提供给Wolf的 `Agent` 模块来调用的. 主要用于三方应用的登录及鉴权处理.

### Rbac-Login-Page

`Agent`登录页面

#### 请求方法: GET
#### 请求URL: /wolf/rbac/login
#### `Query`参数

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
appid | string | 否 | 要登录的应用ID, 如果不带参数, 可以在页面中输入
return_to | string | 否 | 设置登录成功后, 跳转的地址. 默认为 `/`

#### 响应

登录页面HTML.

#### 示例

* 请求

```
http://127.0.0.1:10080/wolf/rbac/login?return_to=%2Fwolf%2Foauth2%2Flogin_status&appid=restful
```

* 响应页面

| ![登录页面](./imgs/screenshot/client/login.png) |
|:--:|
| *登录页面* |


### RBAC-Restful-Login

Rbac登录接口

#### 请求方法: POST
#### 请求URL: /wolf/rbac/login.rest
#### `Request Body`参数

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
appid | string | 是 | 应用ID
username | string | 是 | 登录用户名
password | string | 是 | 登录密码


#### `Response Body` 响应

* data:

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
userInfo | [SimpleUserInfo](SimpleUserInfo) | 是 | 用户基本信息
token | string | 是 | 登录token

* reason
  * `ERR_USERNAME_MISSING` 缺少用户名
  * `ERR_PASSWORD_MISSING` 缺少密码
  * `ERR_APPID_MISSING` 缺少appid
  * `ERR_USER_NOT_FOUND` 用户不存在
  * `ERR_PASSWORD_ERROR` 密码错误
  * `ERR_USER_DISABLED` 用户被禁用


#### 示例

* 请求

```json
curl http://127.0.0.1:10080/wolf/rbac/login.rest \
-H "Content-Type: application/json" \
-X POST \
-d '{
    "username": "root",
    "password": "123456",
    "appid": "restful"
}'
```

* 响应

```json
{
  "ok": true,
  "reason": "",
  "data": {
    "userInfo": {
      "id": 696,
      "username": "root",
      "nickname": "root(super man)"
    },
    "token": "RBAC_TOKEN"
  }
```

为方便执行后面的示例, 可将上面的 `token` 保存为shell环境下的一个变量: 
```shell
export RBAC_TOKEN="WOLF-RBAC-TOKEN-ENCODE-BY-JWT"
```

token过期时间默认为30天. 可通过环境变量 `RBAC_TOKEN_EXPIRE_TIME` 来修改, 单位是秒. 修改之后, 需要重启`Wolf-Server`


### RBAC页面登录提交

#### 请求方法: POST
#### 请求URL: /wolf/rbac/login.submit
#### Content-Type: `application/x-www-form-urlencoded`
#### `Request Body`参数

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
appid | string | 是 | 应用ID
username | string | 是 | 登录用户名
password | string | 是 | 登录密码
return_to | string | 否 | 设置登录成功后, 跳转的地址. 默认为 `/`

#### 响应

* 失败时:

使用302重定向到登录页面.

* 成功时:

使用302重定向到return_to指定的页面.
并设置token到cookie中, key为`x-rbac-token`.

#### 示例

* 请求

```shell
curl 'http://127.0.0.1:10080/wolf/rbac/login.submit' \
-H 'Content-Type: application/x-www-form-urlencoded' \
-d 'return_to=%2F&appid=restful&username=root&password=123456'
```

* 响应

```
< HTTP/1.1 302 Found
< Vary: Origin
< Access-Control-Allow-Origin: *
< Set-Cookie: x-rbac-token=RBAC-TOKEN; path=/; expires=Tue, 09 Jun 2020 08:47:21 GMT
< Location: /
< Content-Type: text/html; charset=utf-8
< Content-Length: 33
```


### RBAC用户信息查询

查询当前登录用户信息

#### 请求方法: GET
#### 请求URL: /wolf/rbac/user_info
#### `Header` 参数: 需要 [`Agent`登录](#Rbac-Login)的token, 通过Cookie传递.
#### `Query`参数

无

#### 响应

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
userInfo | [UserInfo](#UserInfo) | 是 | 用户信息


#### 示例

* 请求

```json
curl http://127.0.0.1:10080/wolf/rbac/user_info \
-H "Cookie: x-rbac-token=$RBAC_TOKEN"
```

* 响应

```json
{
  "ok": true,
  "reason": "",
  "data": {
    "userInfo": {
      "id": 696,
      "username": "root",
      "nickname": "root(super man)",
      "email": null,
      "appIDs": [
        "openresty"
      ],
      "manager": "super",
      "lastLogin": 1589100441,
      "profile": null,
      "createTime": 1578401859,
      "permissions": {},
      "roles": {}
    }
  }
}
```

### logout

#### 请求方法: POST
#### 请求URL: /wolf/rbac/logout
#### `Header` 参数: 需要 [`Agent`登录](#Rbac-Login)的token, 通过Cookie传递.
#### `Query`参数

无

#### 响应

由于wolf并不实际存储RBAC_TOKEN, 所以注销登录后, 只需要删除客户端token即可.
操作完成后, 服务器将Cookie中的`x-rbac-token`设置为logouted. 并将302跳转到登录页面.


#### 示例

* 请求

```json
curl http://127.0.0.1:10080/wolf/rbac/logout \
-H "Cookie: x-rbac-token=$RBAC_TOKEN"
```

* 响应

```curl
< HTTP/1.1 302 Found
< x-rbac-userID: 696
< x-rbac-username: root
< Set-Cookie: x-rbac-token=logouted; path=/; expires=Tue, 09 Jun 2020 09:04:56 GMT
< Location: /wolf/rbac/login.html?appid=restful
< Content-Type: text/html; charset=utf-8
< Content-Length: 101
```

### 修改密码接口

#### 请求方法: POST
#### 请求URL: /wolf/rbac/change_pwd
#### `Header` 参数: 需要 [`Agent`登录](#Rbac-Login)的token, 通过Cookie传递.
#### `Request Body`参数

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
oldPassword | string | 是 | 原有密码
newPassword | string | 是 | 新密码

#### `Response Body` 响应

* data:

无

* reason
  * `ERR_PASSWORD_CHANGE_NOT_ALLOWED` 服务器不允许修改密码.
  * `ERR_OLD_PASSWORD_REQUIRED` 缺少原密码
  * `ERR_NEW_PASSWORD_REQUIRED` 缺少新密码
  * `TOKEN_USER_NOT_FOUND` 用户不存在
  * `ERR_OLD_PASSWORD_INCORRECT` 原密码错误


#### 示例

* 请求

```json
curl http://127.0.0.1:10080/wolf/rbac/change_pwd \
-H "Cookie: x-rbac-token=$RBAC_TOKEN" \
-H "Content-Type: application/json" \
-X POST \
-d '{
    "oldPassword": "old-password",
    "newPassword": "new-password"
}'
```

* 响应

```json
{
  "ok": true,
  "reason": "",
  "data": {}
}
```



### 权限检查接口

检查用户是否对指定资源(appid + action + resName)具有访问权限.

#### 请求方法: POST
#### 请求URL: /wolf/rbac/access_check
#### `Header` 参数: 需要 [`Agent`登录](#Rbac-Login)的token, 通过Cookie传递.
#### `Request Body`参数

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
action | string | 是 | 动作, 一般是HTTP请求方法.
resName | string | 是 | 资源名称, 一般是 `URL Path` 或资源后缀.

appid不需要传递, 服务直接从token中获取

#### `Response Body` 响应

如果有权限, 服务器返回200状态码, json中 `ok=true`, 并返回用户信息
如果没权限, 服务器返回401状态码, json中 `ok=false`, 并返回用户信息

* data:

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
userInfo | [UserInfo](#UserInfo) | 是 | 当前用户信息

* reason 没权限时为相应的提示信息.


#### 示例

* 请求

```json
curl http://127.0.0.1:10080/wolf/rbac/access_check \
-H "Cookie: x-rbac-token=$RBAC_TOKEN" \
-H "Content-Type: application/json" \
-X POST \
-d '{
    "action": "GET",
    "resName": "/"
}'
```

* 响应

```json
{
  "ok": true,
  "reason": "",
  "data": {
    "userInfo": {
      "id": 696,
      "username": "root",
      "nickname": "root(super man)",
      "email": null,
      "appIDs": [
        "openresty"
      ],
      "manager": "super",
      "lastLogin": 1589100441,
      "profile": null,
      "createTime": 1578401859,
      "permissions": {},
      "roles": {}
    }
  }
}
```


[Back to TOC](#目录)
