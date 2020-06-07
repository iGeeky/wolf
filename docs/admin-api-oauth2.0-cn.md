[English](admin-api-oauth2.0.md)

# 目录

- [目录](目录)
  - [Overview](#overview)
  - [Token Lifetime](#TokenLifetime)
  - [Authorization Code](#AuthorizationCode)
    - [Authorize](#Authorize)
    - [Get Token By Authorization Code](#Get-Token-By-AuthorizationCode)
  - [Password Credentials](#PasswordCredentials)
    - [Get Token by Password](#Get-Token-By-PasswordCredentials)
  - [Client Credentials](#ClientCredentials)
    - [Get Token by Client Credentials](#Get-Token-By-ClientCredentials)
  - [Public APIs](#Public-APIs)
    - [Refresh Token](#RefreshToken)
    - [User Info](#UserInfo)
    - [Login Status](#LoginStatus)
    - [Access Check](#AccessCheck)

# Overview

Wolf支持OAuth2.0授权方式. 其它应用可以直接使用OAuth2接口, 集成Wolf登陆及账号系统. 并使用Wolf的权限.
Wolf的OAuth2支持了3种授权方式:

* 授权码模式 (authorization code)
* 密码模式 (password credentials)
* 客户端模式 (client credentials)

# TokenLifetime

Token的全局存活时间默认为7天, 可通过环境变量 `OAUTH_ACCESS_TOKEN_LIFETIME` 来修改它, 单位为秒. 同时每个应用可以单独设置 accessTokenLifetime. 参考[admin-api/application](./admin-api-cn.md#API-Application) 添加应用 一节.

RefreshToken的全局存活时间默认为30天, 可通过环境变量 `OAUTH_REFRESH_TOKEN_LIFETIME` 来修改它, 单位为秒. 同时每个应用可以单独设置 refreshTokenLifetime. 参考[admin-api/application](./admin-api-cn.md#API-Application) 添加应用 一节.


# AuthorizationCode

授权码模式

### Authorize

OAuth2获取授权码请求. <br/>

如果请求中已经有token, 该接口会返回302, 并跳转到回调地址(就是`redirect_uri`)上. 将授权码及state作为请求参数. 应用程序需要在该回调接口中通过授权码获取OAuth2的 `AccessToken` 和 `RefreshToken`<br/>

如果请求中没有token, 服务器会自动跳转到Wolf的[Rbac Login](./admin-api-cn.md#Rbac-Login-Page)页面, 要求用户进行登陆.成功后, 继续进行授权操作.<br/>

服务器可以从请求头(x-rbac-token)或Cookie(key为x-rbac-token)中读取Token信息. token信息通常是由浏览器自动添加上, 不需要做额外操作.<br/>


#### 请求方法: GET
#### 请求URL: /wolf/oauth2/authorize
#### `Query`参数

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
client_id | string | 是 | client_id, 对应于Wolf中的`Application.id`.
response_type | string | 是 | oauth响应类型, 此处固定为`code`
state | string | 是 | 用来防止CSRF攻击的, 具体意义及说明请参考OAuth2的RFC. 请务必设置该值, 并在oauth 重定向url中校验该值.
redirect_uri | string | 是 | 重定向uri, 需要在`Application`中已经设置的`RedirectUri`.


#### `Response Body` 响应

授权失败时:

* reason
  * `ERR_OAUTH_AUTHORIZE_FAILED` 授权失败时, 返回该错误码.

授权成功时, 返回302状态码, 并跳转到请求设置的`redirect_uri`回调地址上.


#### 示例

* 请求

```json
curl -v 'http://127.0.0.1:10080/wolf/oauth2/authorize?grant_type=authorization_code&response_type=code&client_id=test&redirect_uri=http://localhost:10080/wolf/oauth2/client_app&state=myState' \
-H "Cookie: x-rbac-token=$RBAC_TOKEN"
```

* 响应

```
< HTTP/1.1 302 Found
< Vary: Origin
< Access-Control-Allow-Origin: *
< Content-Type: application/json; charset=utf-8
< location: http://localhost:10080/wolf/oauth2/client_app?code=a5d610512e7f367a4cc628db0f30da0fcfcbbaae&state=myState
< Content-Length: 2
< Date: Sun, 10 May 2020 14:03:04 GMT
< Connection: keep-alive
```

### Get-Token-By-AuthorizationCode

通过`AuthorizationCode`获取Token

#### 请求方法: POST
#### 请求URL: /wolf/oauth2/token
#### Content-Type: `application/x-www-form-urlencoded`
#### `Request Body`参数

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
client_id | string | 是 | client_id, 对应于Wolf中的`Application.id`.
client_secret | string | 是 | client_secret, 对应于Wolf中的`Application.secret`
grant_type | string | 是 | 授权类型, 值为: authorization_code
code | string | 是 | 授权码, 即回调uri中的参数code值.


#### `Response Body`响应

* data

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
client_id | string | 是 | 对应于请求的client_id
user_id | string | 是 | 当前用户的用户ID. 注意: 同一个用户, 在不同的应用中的用户ID是不同的.
access_token | string | 是 | 访问Token.
refresh_token | string | 是 | 刷新用的Token.
token_type | string | 是 | token类型, OAuth2的token总是Bearer类型.
expires_in | integer | 是 | access_token的过期时间(秒)

* reason
  * `ERR_OAUTH_GET_TOKEN_FAILED`  获取token失败时, 返回该错误码. errmsg中有具体错误原因.


#### 示例

* 请求

```json
curl 'http://127.0.0.1:10080/wolf/oauth2/token' \
-H "Content-Type: application/x-www-form-urlencoded" \
-X POST \
-d "grant_type=authorization_code&client_id=test&client_secret=yghS6isJ3PtPBz2pr8v8XN7OmR5QbuYNNuraDDgs&code=a5d610512e7f367a4cc628db0f30da0fcfcbbaae"
```

* 响应

```json
{
  "ok": true,
  "reason": "",
  "data": {
    "client_id": "test",
    "user_id": "JcAsVxT58qNNlEv-Ga3vXgj40L",
    "access_token": "91821948723fb2548db4a5e5a2684793c861e59a",
    "refresh_token": "936733dfe080db0706047aafd5b5c3aaf0c90070",
    "token_type": "Bearer",
    "expires_in": 604799
  }
}
```


# PasswordCredentials

密码模式

### Get-Token-By-PasswordCredentials

通过`用户名`,`密码`获取Token

#### 请求方法: POST
#### 请求URL: /wolf/oauth2/token
#### Content-Type: `application/x-www-form-urlencoded`
#### `Request Body`参数

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
client_id | string | 是 | client_id, 对应于Wolf中的`Application.id`.
client_secret | string | 是 | client_secret, 对应于Wolf中的`Application.secret`
grant_type | string | 是 | 授权类型, 值为: password
username | string | 是 | 登录的rbac用户名
password | string | 是 | 登录的rbac用户密码


#### `Response Body`响应

* data

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
client_id | string | 是 | 对应于请求的client_id
user_id | string | 是 | 当前用户的用户ID. 注意: 同一个用户, 在不同的应用中的用户ID是不同的.
access_token | string | 是 | 访问Token.
refresh_token | string | 是 | 刷新用的Token.
token_type | string | 是 | token类型, OAuth2的token总是Bearer类型.
expires_in | integer | 是 | access_token的过期时间(秒)

* reason
  * `ERR_OAUTH_GET_TOKEN_FAILED`  获取token失败时, 返回该错误码. errmsg中有具体错误原因.


#### 示例

* 请求

```json
curl 'http://127.0.0.1:10080/wolf/oauth2/token' \
-H "Content-Type: application/x-www-form-urlencoded" \
-X POST \
-d "grant_type=password&client_id=test&client_secret=yghS6isJ3PtPBz2pr8v8XN7OmR5QbuYNNuraDDgs&username=admin&password=123456"
```

* 响应

```json
{
  "ok": true,
  "reason": "",
  "data": {
    "client_id": "test",
    "user_id": "DD7D7KEy7kVQ5QpQTCa8QQk9t-",
    "access_token": "fe548b9d6676be40ac99f59da7d5e9799c9b784f",
    "refresh_token": "abfc8cf9880f685472e09bc1f77626079e39efa8",
    "token_type": "Bearer",
    "expires_in": 604799
  }
}
```


# ClientCredentials

客户端模式

### Get-Token-By-ClientCredentials

通过`client_id`,`client_secret`获取Token, 整个应用使用同一个token.

#### 请求方法: POST
#### 请求URL: /wolf/oauth2/token
#### Content-Type: `application/x-www-form-urlencoded`
#### `Request Body`参数

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
client_id | string | 是 | client_id, 对应于Wolf中的`Application.id`.
client_secret | string | 是 | client_secret, 对应于Wolf中的`Application.secret`
grant_type | string | 是 | 授权类型, 值为: client_credentials


#### `Response Body`响应

* data

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
client_id | string | 是 | 对应于请求的client_id
user_id | string | 是 | 当前用户的用户ID. 注意: 同一个用户, 在不同的应用中的用户ID是不同的.
access_token | string | 是 | 访问Token.
token_type | string | 是 | token类型, OAuth2的token总是Bearer类型.
expires_in | integer | 是 | access_token的过期时间(秒)

* reason
  * `ERR_OAUTH_GET_TOKEN_FAILED`  获取token失败时, 返回该错误码. errmsg中有具体错误原因.


#### 示例

* 请求

```json
curl 'http://127.0.0.1:10080/wolf/oauth2/token' \
-H "Content-Type: application/x-www-form-urlencoded" \
-X POST \
-d "grant_type=client_credentials&client_id=test&client_secret=yghS6isJ3PtPBz2pr8v8XN7OmR5QbuYNNuraDDgs"
```

* 响应

```json
{
  "ok": true,
  "reason": "",
  "data": {
    "client_id": "test",
    "user_id": "app:test",
    "access_token": "6068ea1c46616bc05fbd7357172382acdcbfb37f",
    "token_type": "Bearer",
    "expires_in": 604799
  }
}
```



# Public-APIs

### RefreshToken

通过`refresh_token`刷新`access_token`, 本接口与[获取Token](#Get-Token-By-AuthorizationCode)接口为同一接口, 只是参数不同.

#### 请求方法: POST
#### 请求URL: /wolf/oauth2/token
#### Content-Type: `application/x-www-form-urlencoded`
#### `Request Body`参数

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
client_id | string | 是 | client_id, 对应于Wolf中的`Application.id`.
client_secret | string | 是 | client_secret, 对应于Wolf中的`Application.secret`
grant_type | string | 是 | 授权类型, 值为: refresh_token
refresh_token | string | 是 | 刷新用的token


#### `Response Body` 响应

* data

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
client_id | string | 是 | 对应于请求的client_id
user_id | string | 是 | 当前用户的用户ID. 注意: 同一个用户, 在不同的应用中的用户ID是不同的.
access_token | string | 是 | 访问Token.
refresh_token | string | 是 | 刷新用的Token.
token_type | string | 是 | token类型, OAuth2的token总是Bearer类型.
expires_in | integer | 是 | access_token的过期时间(秒)

* reason
  * `ERR_OAUTH_REFRESH_TOKEN_FAILED`  刷新token失败时, 返回该错误码. errmsg中有具体错误原因.


#### 示例

* 请求

```json
curl 'http://127.0.0.1:10080/wolf/oauth2/token' \
-H "Content-Type: application/x-www-form-urlencoded" \
-X POST \
-d "grant_type=refresh_token&client_id=test&client_secret=yghS6isJ3PtPBz2pr8v8XN7OmR5QbuYNNuraDDgs&refresh_token=936733dfe080db0706047aafd5b5c3aaf0c90070"
```

* 响应

```json
{
  "ok": true,
  "reason": "",
  "data": {
    "client_id": "test",
    "user_id": "JcAsVxT58qNNlEv-Ga3vXgj40L",
    "access_token": "581ba8dd111478bf100806a2e37e0d5435e36a1b",
    "refresh_token": "29f9a8cb8b4d4246e8a67750a7e88f3db53fad92",
    "token_type": "Bearer",
    "expires_in": 604799
  }
}
```

### UserInfo

获取用户信息

#### 请求方法: GET
#### 请求URL: /wolf/oauth2/user_info
#### `Header` 参数: 需要 OAuth2登陆后的 `access_token`, 通过 `Authorization` 请求头传递.
#### `Query`参数

无

#### `Response Body`响应

* data

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
userInfo | [UserInfo](./admin-api-cn.md#UserInfo) | 是 | 用户基本信息

* reason
  * `ERR_OAUTH_GET_TOKEN_FAILED`  获取token失败时, 返回该错误码. errmsg中有具体错误原因.


#### 示例

* 请求

```json
curl 'http://127.0.0.1:10080/wolf/oauth2/user_info' \
-H "Authorization: Bearer 581ba8dd111478bf100806a2e37e0d5435e36a1b"
```

* 响应

```json
{
  "ok": true,
  "reason": "",
  "data": {
    "userInfo": {
      "id": "JcAsVxT58qNNlEv-Ga3vXgj40L",
      "username": "root",
      "nickname": "root(super man)",
      "email": null,
      "appIDs": [
        "openresty"
      ],
      "manager": "super",
      "lastLogin": 1589118587,
      "profile": null,
      "createTime": 1578401859,
      "permissions": {},
      "roles": {}
    }
  }
}
```


### LoginStatus

查看当前用户RBAC登陆(非OAuth2登录)情况. 并有登出, 修改密码,登录相关入口.

#### 请求方法: GET
#### 请求URL: /wolf/oauth2/login_status
#### `Header` 参数: Cookie参数, 由浏览器自动发送.
#### `Query`参数

无

#### `Response Body`响应

渲染的html页面.

#### 示例

* 请求

```json
curl 'http://127.0.0.1:10080/wolf/oauth2/login_status' \
-H "Cookie: x-rbac-token=$RBAC_TOKEN"
```

* 响应页面

| ![登录状态页面](./imgs/screenshot/client/login-status.png) |
|:--:|
| *登录状态页面* |


### AccessCheck

查询用户对某个资源是否有访问权限

#### 请求方法: GET
#### 请求URL: /wolf/oauth2/access_check
#### Content-Type: `application/x-www-form-urlencoded`
#### `Header` 参数: 需要 OAuth2登陆后的 `access_token`, 通过 `Authorization` 请求头传递.
#### `Query`参数

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
action | string | 是 | 动作, 一般是HTTP请求方法.
resName | string | 是 | 资源名称, 一般是 `URL Path` 或资源后缀.

#### `Response Body`响应

如果有权限, 服务器返回200状态码, json中 `ok=true`, 并返回用户信息
如果没权限, 服务器返回401状态码, json中 `ok=false`, 并返回用户信息

* data:

字段 | 类型 | 必填项 |说明
-------|-------|------|-----
userInfo | [UserInfo](#UserInfo) | 是 | 当前用户信息

* reason 没权限时为相应的提示信息.


#### 示例

需要在控制台上先配置相应资源及用户的访问权限.

* 请求

```json
curl 'http://127.0.0.1:10080/wolf/oauth2/access_check' \
-H "Authorization: Bearer 581ba8dd111478bf100806a2e37e0d5435e36a1b" \
-H "Content-Type: application/x-www-form-urlencoded" \
-d 'action=GET&resName=/path/to/resource'
```

* 响应

```json
{
  "ok": true,
  "reason": "",
  "data": {
    "userInfo": {
      "id": "JCC0rNOwfMQZzOoHCO9UJgxt8h",
      "username": "test",
      "nickname": "test",
      "email": "",
      "appIDs": [
        "test"
      ],
      "manager": "none",
      "lastLogin": 1590912693,
      "profile": null,
      "createTime": 1590912586,
      "permissions": {},
      "roles": {}
    }
  }
}
```
