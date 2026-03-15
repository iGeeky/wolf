const Sequelize = require('../util/sequelize')
const Seq = require('sequelize')

const model = Sequelize.define('ai_chat_session', {
  id: {
    type: Seq.BIGINT,
    autoIncrement: true,
    primaryKey: true,
  },
  userID: { type: Seq.BIGINT, field: 'user_id' },
  title: { type: Seq.TEXT, defaultValue: '' },
  appID: { type: Seq.TEXT, field: 'app_id' },
  status: { type: Seq.SMALLINT, defaultValue: 1 },
  memoryExtractedAt: { type: Seq.BIGINT, field: 'memory_extracted_at', defaultValue: 0 },
  createTime: { type: Seq.BIGINT, field: 'create_time' },
  updateTime: { type: Seq.BIGINT, field: 'update_time' },
}, {
  freezeTableName: true,
})

module.exports = model
