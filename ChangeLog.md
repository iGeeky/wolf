2022-07-10 0.5.4

* `Server` Replacing the redis library with ioredis
* `Server` Support for redis as object cache
* `Server` Return 403 http status code when accessing resources without permission

2022-05-25 0.5.3

* `Server`: save login token to redis.
* `Server` & `Console` upgrade dependencies packages.
* `NodeJS` upgraded to v14.17.3
* `npm` upgraded to 6.14.13
* Replaced `node-sass` with `sass`

2021-12-29 0.5.2

* `Console`: selection permission by transfer.

2021-10-22 0.5.0

* Support LDAP authenticate

2021-08-21 0.4.1

* Support MySQL.

2021-07-07 0.4.0

* 服务端口从1008x修改为1218x(解决chrome访问失败的问题).
* `Console`支持中文.

2021-01-14 0.3.3

* 接口添加更严格的参数校验.

2020-05-04 0.3.1

* Application Secret加密保存
* 添加 `WOLF_CRYPT_KEY` 环境变量, 用于设置Secret及OAuth用户ID加密的Key.

2020-05-04 0.3.0

* 登陆支持OAuth2
* API接口被修改为更符合RESTful格式

2020-02-23 0.2.3

* `token` 添加版本
* RBAC 接口添加用户信息获取接口 `/wolf/rbac/user_info`
* 禁用用户
* rbac URL变更
  * `/wolf/rbac/login` ==> `/wolf/rbac/login.html`
  * `/wolf/rbac/login.rest` ==> `/wolf/rbac/login`
  * `/wolf/rbac/change_pwd` ==> `/wolf/rbac/change_pwd.html`
  * `/wolf/rbac/change_pwd.rest` ==> `/wolf/rbac/change_pwd`

2020-02-10 0.2.2

* 日志记录支持查看请求 `body` 或 `args`

2020-01-13 0.2.1

* 添加 `appid` 到 `token` 中.
* url 前缀修改为 `/wolf/`
* 性能优化.日志优化

2020-01-08 0.1.12

* `bcrypt` 模块修改为 `bcrypt-node`

2019-12-22 0.1.11

* 完善单元测试
* 添加 `istanbul/syc` 进行代码覆盖率测试. 
  * 93.95% Statements
  * 78.49% Branches
  * 93.91% Functions 185/197
  * 93.93% Lines 1455/1549
* rbac策略单元测试.

2019-11-16 0.1.10

初始版本.

* RBAC权限控制
* 应用管理
* 用户管理
* 角色管理
* 权限分类
* 权限管理
* 资源管理


