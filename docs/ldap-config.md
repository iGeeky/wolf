
LDAP Configuration


## Steps and instructions to enable LDAP

* Wolf supports LDAP authentication. To enable it, you need to modify the `wolf-server` configuration and then reboot the server.
* After the configuration is complete, the `LDAP` account information will not be synchronized in real-time by `Wolf`. It will only be synced once the user logs into the `Console` or `Agent` of the `Wolf` system.
* If a new user wants to use a Wolf-managed application for the first time, the general steps are:
  * The user logs into the application through the `Agent` and selects the `LDAP` login method.
    * Note: The login may fail due to lack of permissions, but the account information will still be synced to Wolf.
  * The administrator then authorizes the user in the Console.
  * The user can log in again to the application that has been authorized.
* `LDAP` users can only choose to log in using the LDAP method, and not with a password.
* The default `administrator` accounts `root` and `admin` added by Wolf can log in using their account password.

## Configuration

To configure the Wolf system to use LDAP authentication, you need to modify the configuration file `server/conf/config.js`. Add the following configuration (the configuration already has a section for `ldapConfig__` by default, you can change it to `ldapConfig`). Please modify the configuration to match your actual environment:

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

The following table provides a description of the configuration keys in the `server/conf/config.js` file for LDAP authentication:

Configuration Key | Description
-------| -------
label | The label that will be displayed as a login option in both `Console` and `Agent`.
url | The URL of the LDAP server.
baseDn | The base DN of the LDAP directory.
adminDn | The DN of the LDAP administrator.
adminPassword | The password of the LDAP administrator.
userIdBase | The base for mapping user IDs when the `LDAP` user is synced to `wolf`. The value of `userIdBase` will be added to the `LDAP` user ID.
fieldsMap | A key-value pair that maps the fields in wolf to the corresponding fields in the LDAP system. The key is the field name in wolf (which can be `id`, `username`, `nickname`, or `email`), and the value is the corresponding field in the LDAP system. The example shows the configuration for `OpenLDAP`.

### Once LDAP authentication is enabled, the login options in both `Console` and `Agent` will automatically include an LDAP login option, as shown in the following screenshot:

![Client Login](./imgs/screenshot/client/login.png)
