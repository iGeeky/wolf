const Sequelize = require('../util/sequelize')
const Seq = require('sequelize');

const model = Sequelize.define('user', {
  id: {
    type: Seq.BIGINT,
    autoIncrement: true,
    primaryKey: true,
  },
  username: {type: Seq.STRING},
  nickname: {type: Seq.STRING},
  email: {type: Seq.STRING},
  tel: {type: Seq.STRING},
  password: {type: Seq.STRING},
  appIDs: {type: Seq.ARRAY(Seq.STRING), field: 'app_ids'},
  manager: {type: Seq.STRING},
  status: {type: Seq.SMALLINT},
  lastLogin: {type: Seq.INTEGER, field: 'last_login'},
  profile: {type: Seq.JSONB},
  createTime: {type: Seq.INTEGER, field: 'create_time'},
  updateTime: {type: Seq.INTEGER, field: 'update_time'},
}, {
  freezeTableName: true,
})

module.exports = model
