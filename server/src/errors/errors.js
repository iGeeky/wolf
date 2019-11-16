exports.ERR_OBJECT_NOT_FOUND = 'ERR_OBJECT_NOT_FOUND';
exports.ERR_USER_NOT_FOUND = 'ERR_USER_NOT_FOUND';
exports.ERR_PASSWORD_ERROR = 'ERR_PASSWORD_ERROR';
exports.TOKEN_NOT_FOUND = 'TOKEN_NOT_FOUND';
exports.ERR_SERVER_ERROR = 'ERR_SERVER_ERROR';
exports.ERR_PERMISSION_DENY = 'ERR_PERMISSION_DENY';

const msgs = {
  ERR_OBJECT_NOT_FOUND: 'Object not found',
  ERR_USER_NOT_FOUND: 'User not found',
  ERR_PASSWORD_ERROR: 'Password error',
  TOKEN_NOT_FOUND: 'Token not found',
  ERR_SERVER_ERROR: 'Server Internal Error',
  ERR_PERMISSION_DENY: 'Permission Deny',
}

function errmsg(reason) {
  return msgs[reason]
}

exports.errmsg = errmsg;
