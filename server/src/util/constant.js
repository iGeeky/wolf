
const UserStatus = {
  Normal: 0,
  Disabled: -1,
}

const Manager = {
  admin: 'admin',
  super: 'super',
}

const SystemPerm = {
  ALLOW_ALL: 'ALLOW_ALL',
  DENY_ALL: 'DENY_ALL',
}

const MatchType = {
  equal: 'equal',
  suffix: 'suffix',
  prefix: 'prefix',
}

exports.UserStatus = UserStatus
exports.Manager = Manager
exports.SystemPerm = SystemPerm
exports.MatchType = MatchType
