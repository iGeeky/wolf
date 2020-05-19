const Sequelize = require('../util/sequelize')
const Seq = require('sequelize')

const model = Sequelize.define('resource', {
  id: {
    type: Seq.TEXT,
    autoIncrement: true,
    primaryKey: true,
  },
  appID: { type: Seq.TEXT, field: 'app_id' },
  matchType: { type: Seq.TEXT, field: 'match_type' },
  name: { type: Seq.TEXT },
  nameLen: { type: Seq.INTEGER, field: 'name_len' },
  priority: { type: Seq.INTEGER },
  action: { type: Seq.TEXT },
  permID: { type: Seq.TEXT, field: 'perm_id' },
  createTime: { type: Seq.INTEGER, field: 'create_time' },
  updateTime: { type: Seq.INTEGER, field: 'update_time' },
}, {
  freezeTableName: true,
})

module.exports = model
