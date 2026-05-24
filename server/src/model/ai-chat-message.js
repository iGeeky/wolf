const Sequelize = require('../util/sequelize')
const Seq = require('sequelize')

const model = Sequelize.define('ai_chat_message', {
  id: {
    type: Seq.BIGINT,
    autoIncrement: true,
    primaryKey: true,
  },
  sessionID: { type: Seq.BIGINT, field: 'session_id' },
  role: { type: Seq.TEXT },
  content: { type: Seq.JSONB },
  tokenUsage: { type: Seq.JSONB, field: 'token_usage' },
  createTime: { type: Seq.BIGINT, field: 'create_time' },
}, {
  freezeTableName: true,
})

module.exports = model
