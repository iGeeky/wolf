
LDAP Configuration


## Steps and instructions to enable LDAP

* wolf supports LDAP authentication, you need to modify `wolf-server` configuration, and then reboot.
* After configuration, `wolf` will not actively synchronize the `LDAP` account information, it will be synchronized only after the user logs into the `Console` or `Agent` of the `wolf` system.
* When a new user uses a `wolf` managed application for the first time, the general steps are:
  * The user logs into the application through the `Agent`, and selects the `LDAP` login method.
    * Note: When logging in, the login will fail because you don't have the appropriate permissions, but the account information will be synced to wolf.
  * The administrator will authorize the user in the `Console`.
  * The user can log in again to an application that has already been authorized.
* `LDAP` users can only choose to use `LDAP` to log in, not the password method.
* The default `administrator` accounts `root` and `admin` added by `wolf` can log in with the account password.

## Configuration

Modify the configuration file `server/conf/config.js`, add the following configuration (the configuration already has `ldapConfig__` by default, you can change it to `ldapConfig`):
Please modify the configuration according to the actual situation.

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

### Configuration Description

Configuration Key | Description
-------| -------
label | The configured label, which will be displayed in the login options of `Console` and `Agent`.
url | The `url` of the `LDAP` server.
baseDn | The base DN of `LDAP`.
adminDn | The administrator's DN.
adminPassword | The administrator's password.
userIdBase | User ID mapping base, when `LDAP` user syncs to `wolf`, `userIdBase` will be added based on `LDAP` user ID.
fieldsMap | fieldsMap value. key-value pair, the key is the field name in wolf, can be `id`,`username`,`nickname`,`email`, the value is the corresponding field in the ldap system. The example shows the configuration of `OpenLDAP`.

### When `LDAP` is enabled, both `Console` and `Agent` logins will automatically add LDAP login options, as shown below:

![Client Login](./imgs/screenshot/client/login.png)
