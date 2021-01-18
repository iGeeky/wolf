const BasicService = require('./basic-service')
const UserRoleModel = require('../model/user-role')
const RoleModel = require('../model/role')
const PermissionModel = require('../model/permission')


class SubUser extends BasicService {
  constructor(ctx) {
    super(ctx)
  }

  async permissions() {
    this.checkMethod('GET')
    let where = {}
    let options = {}
    const userID = this.getRequiredIntArg('userID')
    const appID = this.getRequiredArg('appID')
    where = {userID, appID}
    options = {where}
    const userRole = await UserRoleModel.findOne(options)
    const roleIDs = userRole.roleIDs

    let role_info = {}
    let permIDs = []
    for (let i=0; i<roleIDs.length; i++)
    {
      where = {appID, id: roleIDs[i]}
      options = {where}
      role_info = await RoleModel.findOne(options)
      for (let j=0; j<role_info.permIDs.length; j++) {
        if (permIDs.indexOf(role_info.permIDs[j]) == -1) 
          permIDs.push(role_info.permIDs[j]);
      }
    }

    let perm_info = {}
    let permissions = []
    for (let i=0; i<permIDs.length; i++)
    {
      where = {appID, id: permIDs[i]}
      options = {where, include: ['category']}
      perm_info = await PermissionModel.findOne(options)
      permissions.push(perm_info.toJSON())
    }
    const total = permissions.length;
    const data = {permissions, total}
    this.success(data)
  }


}

module.exports = SubUser

