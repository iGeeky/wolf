const Sequelize = require('../util/sequelize')
const Seq = require('sequelize')

const model = Sequelize.define('ai_user_memory', {
  id: {
    type: Seq.BIGINT,
    autoIncrement: true,
    primaryKey: true,
  },
  userID: { type: Seq.BIGINT, field: 'user_id' },
  sessionID: { type: Seq.BIGINT, field: 'session_id', allowNull: true },
  category: { type: Seq.STRING(32) },
  content: { type: Seq.TEXT },
  source: { type: Seq.STRING(16), defaultValue: 'auto' },
  status: { type: Seq.SMALLINT, defaultValue: 1 },
  createTime: { type: Seq.BIGINT, field: 'create_time' },
  updateTime: { type: Seq.BIGINT, field: 'update_time' },
}, {
  freezeTableName: true,
})

module.exports = model
