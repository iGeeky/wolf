
LDAP配置

## 启用LDAP步骤及说明

* wolf支持LDAP认证, 需要修改`wolf-server`配置, 然后重启.
* 配置之后, `wolf`不会主动同步`LDAP`账号信息, 需要用户登录`wolf`系统的`Console`或`Agent`后, 才会同步.
* 新用户首次使用`wolf`管理的应用时, 一般步骤为:
  * 用户通过`Agent`登录应用, 登录方式选择`LDAP`方式.
    * 注意: 登录时, 由于没有相应权限, 会登录失败, 但账号信息会同步到wolf中.
  * 管理员在`Console`中对用户进行授权.
  * 用户再次登录已经被授权的应用.
* `LDAP`用户只能选择使用`LDAP`方式登录, 不能使用账号密码方式.
* `wolf`默认添加的`管理员`账号`root`及`admin`, 可以使用账号密码方式登录.


## 配置

修改配置文件 `server/conf/config.js`, 添加如下配置(配置中默认已经有了`ldapConfig__`, 你可以将它修改为`ldapConfig`):
具体配置请根据实际情况修改.

```js
  ldapConfig: {
    label: 'OpenLDAP',
    url: 'ldap://127.0.0.1:389',
    baseDn: 'dc=example,dc=org',
    adminDn: 'cn=admin,dc=example,dc=org',
    adminPassword: '123456',
    userIdBase: 10000 * 100, // wolf user id = ldap user id + userIdBase
    fieldsMap: { // key=wolf-fieldname, value=ldap-fieldname
      id: 'uidNumber',
      username: 'uid',
      nickname: 'dn',
      email: 'mail',
    },
  },
```

### 配置说明

配置key | 说明
-------| -------
label | 配置的label, 会显示在`Console`与`Agent`的登录选项中.
url | `LDAP`服务器的`url`
baseDn | `LDAP`的基准DN
adminDn | 管理员的DN.
adminPassword | 管理员的密码.
userIdBase | 用户ID映射基数, `LDAP`用户同步到`wolf`时, 会根据`LDAP`用户ID加上 `userIdBase`.
fieldsMap | 字段映射值. 键值对, 键为wolf中的字段名, 可以为`id`,`username`,`nickname`,`email`, 值为ldap系统中对应的字段. 示例中为`OpenLDAP`的配置.

### 启用`LDAP`后, `Console` 及 `Agent` 登录都会自动添加LDAP登录选项, 如下图:

 ![客户端登陆](./imgs/screenshot/client/login.png)

