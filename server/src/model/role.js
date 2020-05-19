const Sequelize = require('../util/sequelize')
const Seq = require('sequelize')

const model = Sequelize.define('role', {
  id: {
    type: Seq.TEXT,
    primaryKey: true,
  },
  name: { type: Seq.TEXT },
  description: { type: Seq.TEXT },
  appID: { type: Seq.TEXT, field: 'app_id' },
  permIDs: { type: Seq.ARRAY(Seq.TEXT), field: 'perm_ids' },
  createTime: { type: Seq.INTEGER, field: 'create_time' },
  updateTime: { type: Seq.INTEGER, field: 'update_time' },
}, {
  freezeTableName: true,
})

module.exports = model
