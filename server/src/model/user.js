const Sequelize = require('../util/sequelize')
const Seq = require('sequelize')

const model = Sequelize.define('user', {
  id: {
    type: Seq.BIGINT,
    autoIncrement: true,
    primaryKey: true,
  },
  username: { type: Seq.TEXT },
  nickname: { type: Seq.TEXT },
  email: { type: Seq.TEXT },
  tel: { type: Seq.TEXT },
  password: { type: Seq.TEXT },
  appIDs: { type: Seq.ARRAY(Seq.TEXT), field: 'app_ids' },
  manager: { type: Seq.TEXT },
  status: { type: Seq.SMALLINT },
  lastLogin: { type: Seq.INTEGER, field: 'last_login' },
  profile: { type: Seq.JSONB },
  createTime: { type: Seq.INTEGER, field: 'create_time' },
  updateTime: { type: Seq.INTEGER, field: 'update_time' },
}, {
  freezeTableName: true,
})

module.exports = model
