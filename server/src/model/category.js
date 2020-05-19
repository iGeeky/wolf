const Sequelize = require('../util/sequelize')
const Seq = require('sequelize')

const model = Sequelize.define('category', {
  id: {
    type: Seq.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  appID: { type: Seq.TEXT, field: 'app_id' },
  name: { type: Seq.TEXT },
  createTime: { type: Seq.INTEGER, field: 'create_time' },
  updateTime: { type: Seq.INTEGER, field: 'update_time' },
}, {
  freezeTableName: true,
})

module.exports = model
