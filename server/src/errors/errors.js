exports.ERR_OBJECT_NOT_FOUND = 'ERR_OBJECT_NOT_FOUND'
exports.ERR_USER_NOT_FOUND = 'ERR_USER_NOT_FOUND'
exports.ERR_PASSWORD_ERROR = 'ERR_PASSWORD_ERROR'
exports.TOKEN_NOT_FOUND = 'TOKEN_NOT_FOUND'
exports.ERR_SERVER_ERROR = 'ERR_SERVER_ERROR'
exports.ERR_PERMISSION_DENY = 'ERR_PERMISSION_DENY'
exports.ERR_USER_DISABLED = 'ERR_USER_DISABLED'
exports.ERR_OBJECT_NAME_EXIST = 'ERR_OBJECT_NAME_EXIST'
exports.ERR_APPLICATION_ID_EXIST = 'ERR_APPLICATION_ID_EXIST'
exports.ERR_APPLICATION_NAME_EXIST = 'ERR_APPLICATION_NAME_EXIST'
exports.ERR_USERNAME_EXIST = 'ERR_USERNAME_EXIST'
exports.ERR_ROLE_ID_EXIST = 'ERR_ROLE_ID_EXIST'
exports.ERR_ROLE_NAME_EXIST = 'ERR_ROLE_NAME_EXIST'
exports.ERR_APPLICATION_ID_NOT_FOUND = 'ERR_APPLICATION_ID_NOT_FOUND'
exports.ERR_PERMISSION_ID_NOT_FOUND = 'ERR_PERMISSION_ID_NOT_FOUND'
exports.ERR_ROLE_ID_NOT_FOUND = 'ERR_ROLE_ID_NOT_FOUND'

const msgs = {
  ERR_OBJECT_NOT_FOUND: 'Object not found',
  ERR_USER_NOT_FOUND: 'User not found',
  ERR_PASSWORD_ERROR: 'Password error',
  TOKEN_NOT_FOUND: 'Token not found',
  ERR_SERVER_ERROR: 'Server Internal Error',
  ERR_PERMISSION_DENY: 'Permission Deny',
  ERR_USER_DISABLED: 'User is disabled',
  ERR_OBJECT_NAME_EXIST: 'Name already exists',
  ERR_APPLICATION_ID_EXIST: 'Application ID already exists',
  ERR_APPLICATION_NAME_EXIST: 'Application name already exists',
  ERR_USERNAME_EXIST: 'Username already exists',
  ERR_ROLE_ID_EXIST: 'Role ID already exists',
  ERR_ROLE_NAME_EXIST: 'Role name already exists',
  ERR_APPLICATION_ID_NOT_FOUND: 'Application ID not found',
  ERR_PERMISSION_ID_NOT_FOUND: 'Permission ID not found',
  ERR_ROLE_ID_NOT_FOUND: 'Role ID not found',
}

function errmsg(reason) {
  return msgs[reason]
}

exports.errmsg = errmsg
