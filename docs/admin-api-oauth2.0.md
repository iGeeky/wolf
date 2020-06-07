[中文](admin-api-oauth2.0-cn.md)

# Contents

- [Contents](Contents)
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

Wolf supports OAuth2.0 authorization. Other applications can use the OAuth2 interface directly, integrated with Wolf's login and account system. and use Wolf's permissions.
Wolf's OAuth2 supports 3 types of authorization:

* Authorization Code
* Password Credentials
* Client Credentials

# TokenLifetime

The default global lifetime of a Token is 7 days, which can be determined by the environment variable `OAUTH_ACCESS_TOKEN_LIFETIME` can be modified, in seconds. Also, accessTokenLifetime can be set separately for each application. Reference [admin-api/application](./admin-api.md#API-Application) to add an application Section.

The RefreshToken has a default global lifetime of 30 days, which can be set via the environment variable `OAUTH_ REFRESH_TOKEN_LIFETIME` can be modified, in seconds. You can also set refreshTokenLifetime separately for each application. Reference [admin-api/application](./admin-api.md#API-Application) to add an application Section.


# AuthorizationCode


### Authorize

OAuth2 Get Authorization Code Request. <br/>

If there is already a token in the request, the interface returns 302 and jumps to the callback address (i.e. ` redirect_uri`). Use the authorizationCode and state as request parameters. The application needs to retrieve OAuth2's `AccessToken` and the `RefreshToken` by the authorizationCode<br/>

If there is no token in the request, the server automatically redirects the user to Wolf's [Rbac Login](./admin-api.md#Rbac-Login-Page) page and asks the user to login. After success, continue with the authorization operation. <br/>

The server can retrieve the token from the request header (x-rbac-token) or the cookie (key is x-rbac-token). The token information is usually added automatically by the browser, without any additional operation. <br/>


#### Method: GET
#### URL: /wolf/oauth2/authorize
#### `Query` parameters

Fields | Type | Required | Description
-------|-------|------|-----
client_id | string | Yes | client_id, which is `Application.id` in Wolf.
response_type | string | Yes | oauth response type, it is `code` here.
state | string | Yes | It is used to prevent CSRF attacks, please refer to OAuth2 RFC for more details. Please make sure to set this value, and check it in the oauth redirect url.
redirect_uri | string | Yes | To redirect uri, you need the `RedirectUri` already set in `Application`.


#### Response Body

When authorization fails:

* reason
  * `ERR_OAUTH_AUTHORIZE_FAILED` This error code is returned when the authorization fails.

When the authorization succeeds, the 302 status code is returned, and the request is redirected to the `redirect_uri` callback address.


#### example

* Request

```json
curl -v 'http://127.0.0.1:10080/wolf/oauth2/authorize?grant_type=authorization_code&response_type=code&client_id=test&redirect_uri=http://localhost:10080/wolf/oauth2/client_app&state=myState' \
-H "Cookie: x-rbac-token=$RBAC_TOKEN"
```

* Response

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

Get Token by the `AuthorizationCode`

#### Method: POST
#### URL: /wolf/oauth2/token
#### Content-Type: `application/x-www-form-urlencoded`
#### `Request Body` parameters

Fields | Type | Required | Description
-------|-------|------|-----
client_id | string | Yes | client_id, which is `Application.id` in Wolf.
client_secret | string | Yes | client_secret, which is `Application.secret` in Wolf.
grant_type | string | Yes | Grant type, value is: authorization_code
code | string | Yes | Authorization code.


#### Response Body

* data

Fields | Type | Required | Description
-------|-------|------|-----
client_id | string | Yes | Same as the requested client_id
user_id | string | Yes | The user ID of the current user. Note: The user ID of the same user is different for different applications.
access_token | string | Yes | access Token.
refresh_token | string | Yes | refresh token, which is used to update the access token.
token_type | string | Yes | token type, OAuth2 tokens are always of type Bearer.
expires_in | integer | Yes | Expiration time of access_token (seconds)

* reason
  * `ERR_OAUTH_GET_TOKEN_FAILED`  This error code is returned when token acquisition fails. There is a specific error in errmsg.


#### example

* Request

```json
curl 'http://127.0.0.1:10080/wolf/oauth2/token' \
-H "Content-Type: application/x-www-form-urlencoded" \
-X POST \
-d "grant_type=authorization_code&client_id=test&client_secret=yghS6isJ3PtPBz2pr8v8XN7OmR5QbuYNNuraDDgs&code=a5d610512e7f367a4cc628db0f30da0fcfcbbaae"
```

* Response

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

Password Credentials

### Get-Token-By-PasswordCredentials

Get Token by `Username` and `Password`.

#### Method: POST
#### URL: /wolf/oauth2/token
#### Content-Type: `application/x-www-form-urlencoded`
#### `Request Body` parameters

Fields | Type | Required | Description
-------|-------|------|-----
client_id | string | Yes | client_id, which is `Application.id` in Wolf.
client_secret | string | Yes | client_secret, which is `Application.secret` in Wolf.
grant_type | string | Yes | Grant type, value is: password
username | string | Yes | Login rbac username
password | string | Yes | Login rbac user password


#### Response Body

* data

Fields | Type | Required | Description
-------|-------|------|-----
client_id | string | Yes | Same as the requested client_id
user_id | string | Yes | The user ID of the current user. Note: The user ID of the same user is different for different applications.
access_token | string | Yes | access Token.
refresh_token | string | Yes | refresh token, which is used to update the access token.
token_type | string | Yes | token type, OAuth2 tokens are always of type Bearer.
expires_in | integer | Yes | Expiration time of access_token (seconds)

* reason
  * `ERR_OAUTH_GET_TOKEN_FAILED`  This error code is returned when token acquisition fails. There is a specific error in errmsg.


#### example

* Request

```json
curl 'http://127.0.0.1:10080/wolf/oauth2/token' \
-H "Content-Type: application/x-www-form-urlencoded" \
-X POST \
-d "grant_type=password&client_id=test&client_secret=yghS6isJ3PtPBz2pr8v8XN7OmR5QbuYNNuraDDgs&username=admin&password=123456"
```

* Response

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

Client Credentials

### Get-Token-By-ClientCredentials

Get token by `client_id` and `client_secret`, the whole application uses the same token.

#### Method: POST
#### URL: /wolf/oauth2/token
#### Content-Type: `application/x-www-form-urlencoded`
#### `Request Body` parameters

Fields | Type | Required | Description
-------|-------|------|-----
client_id | string | Yes | client_id, which is `Application.id` in Wolf.
client_secret | string | Yes | client_secret, which is `Application.secret` in Wolf.
grant_type | string | Yes | Grant type, value is: client_credentials


#### Response Body

* data

Fields | Type | Required | Description
-------|-------|------|-----
client_id | string | Yes | Same as the requested client_id
user_id | string | Yes | The user ID of the current user. Note: The user ID of the same user is different for different applications.
access_token | string | Yes | access Token.
token_type | string | Yes | token type, OAuth2 tokens are always of type Bearer.
expires_in | integer | Yes | Expiration time of access_token (seconds)


* reason
  * `ERR_OAUTH_GET_TOKEN_FAILED`  This error code is returned when token acquisition fails. There is a specific error in errmsg.


#### example

* Request

```json
curl 'http://127.0.0.1:10080/wolf/oauth2/token' \
-H "Content-Type: application/x-www-form-urlencoded" \
-X POST \
-d "grant_type=client_credentials&client_id=test&client_secret=yghS6isJ3PtPBz2pr8v8XN7OmR5QbuYNNuraDDgs"
```

* Response

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

Refresh `access_token` by `refresh_token`, this interface is the same interface with [Get Token](#Get-Token-By-AuthorizationCode) interface, but with different parameters.

#### Method: POST
#### URL: /wolf/oauth2/token
#### Content-Type: `application/x-www-form-urlencoded`
#### `Request Body` parameters

Fields | Type | Required | Description
-------|-------|------|-----
client_id | string | Yes | client_id, which is `Application.id` in Wolf.
client_secret | string | Yes | client_secret, which is `Application.secret` in Wolf.
grant_type | string | Yes | Grant type, value is: refresh_token
refresh_token | string | Yes | The refresh token.


#### Response Body

* data

Fields | Type | Required | Description
-------|-------|------|-----
client_id | string | Yes | Same as the requested client_id
user_id | string | Yes | The user ID of the current user. Note: The user ID of the same user is different for different applications.
access_token | string | Yes | access Token.
refresh_token | string | Yes | refresh token, which is used to update the access token.
token_type | string | Yes | token type, OAuth2 tokens are always of type Bearer.
expires_in | integer | Yes | Expiration time of access_token (seconds)

* reason
  * `ERR_OAUTH_REFRESH_TOKEN_FAILED`  This error code is returned when the token failed to be refreshed. There is a specific error in errmsg.


#### example

* Request

```json
curl 'http://127.0.0.1:10080/wolf/oauth2/token' \
-H "Content-Type: application/x-www-form-urlencoded" \
-X POST \
-d "grant_type=refresh_token&client_id=test&client_secret=yghS6isJ3PtPBz2pr8v8XN7OmR5QbuYNNuraDDgs&refresh_token=936733dfe080db0706047aafd5b5c3aaf0c90070"
```

* Response

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

Get User Information

#### Method: GET
#### URL: /wolf/oauth2/user_info
#### `Header` parameter: requires `access_token` after OAuth2 login, Passed through the `Authorization` request header.
#### `Query` parameters

None

#### Response Body

* data

Fields | Type | Required | Description
-------|-------|------|-----
userInfo | [UserInfo](./admin-api.md#UserInfo) | Yes | Basic User Information

* reason
  * `ERR_OAUTH_GET_TOKEN_FAILED`  This error code is returned when token acquisition fails. There is a specific error in errmsg.


#### example

* Request

```json
curl 'http://127.0.0.1:10080/wolf/oauth2/user_info' \
-H "Authorization: Bearer 581ba8dd111478bf100806a2e37e0d5435e36a1b"
```

* Response

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

Check the current user's RBAC login status (not OAuth2 login). There are also entries for logout, changing password, and login.

#### Method: GET
#### URL: /wolf/oauth2/login_status
#### `Header` parameter: Cookie parameter, sent by browser automatically.
#### `Query` parameters

None

#### Response Body

The rendered html page.

#### example

* Request

```json
curl 'http://127.0.0.1:10080/wolf/oauth2/login_status' \
-H "Cookie: x-rbac-token=$RBAC_TOKEN"
```

* Response Page

| ![Login Status Page](./imgs/screenshot/client/login-status.png) |
|:--:|
| *Login Status Page* |


### AccessCheck

Queries if a user has access to a resource

#### Method: GET
#### URL: /wolf/oauth2/access_check
#### Content-Type: `application/x-www-form-urlencoded`
#### `Header` parameter: requires `access_token` after OAuth2 login, Passed through the `Authorization` request header.
#### `Query` parameters

Fields | Type | Required | Description
-------|-------|------|-----
action | string | Yes | action, usually an HTTP request method.
resName | string | Yes | The name of the resource, usually `URL Path` or a resource extension.

#### Response Body

If you have permission, the server returns the 200 status code, `ok=true` in json, and the user's information.
If you don't have permission, the server returns the 401 status code, `ok=false` in json, and the user information.

* data:

Fields | Type | Required | Description
-------|-------|------|-----
userInfo | [UserInfo](#UserInfo) | Yes | Current User Information

* reason If you don't have permission, the corresponding message will be displayed.


#### example

You need to configure the corresponding resources and users' access rights on the console first.

* Request

```json
curl 'http://127.0.0.1:10080/wolf/oauth2/access_check' \
-H "Authorization: Bearer 581ba8dd111478bf100806a2e37e0d5435e36a1b" \
-H "Content-Type: application/x-www-form-urlencoded" \
-d 'action=GET&resName=/path/to/resource'
```

* Response

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
