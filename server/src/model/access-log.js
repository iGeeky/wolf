const Sequelize = require('../util/sequelize')
const Seq = require('sequelize')

const model = Sequelize.define('access_log', {
  id: {
    type: Seq.BIGINT,
    autoIncrement: true,
    primaryKey: true,
  },
  appID: { type: Seq.TEXT, field: 'app_id' },
  userID: { type: Seq.TEXT, field: 'user_id' },
  username: { type: Seq.TEXT },
  nickname: { type: Seq.TEXT },
  action: { type: Seq.TEXT },
  resName: { type: Seq.TEXT, field: 'res_name' },
  matchedResource: { type: Seq.JSONB, field: 'matched_resource' },
  status: { type: Seq.SMALLINT },
  body: { type: Seq.JSONB },
  contentType: { type: Seq.TEXT, field: 'content_type' },
  date: { type: Seq.TEXT },
  accessTime: { type: Seq.INTEGER, field: 'access_time' },
  ip: { type: Seq.TEXT },
}, {
  freezeTableName: true,
})

module.exports = model
