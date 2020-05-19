const Sequelize = require('../util/sequelize')
const Seq = require('sequelize')

const model = Sequelize.define('user_role', {
  userID: { type: Seq.INTEGER, field: 'user_id', primaryKey: true },
  appID: { type: Seq.TEXT, field: 'app_id', primaryKey: true },
  permIDs: { type: Seq.ARRAY(Seq.TEXT), field: 'perm_ids' },
  roleIDs: { type: Seq.ARRAY(Seq.TEXT), field: 'role_ids' },
  createTime: { type: Seq.INTEGER, field: 'create_time' },
  updateTime: { type: Seq.INTEGER, field: 'update_time' },
}, {
  freezeTableName: true,
})

module.exports = model
