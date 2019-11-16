const Sequelize = require('../util/sequelize')
const Seq = require('sequelize');

const model = Sequelize.define('resource', {
  id: {
    type: Seq.STRING,
    autoIncrement: true,
    primaryKey: true,
  },
  appID: {type: Seq.STRING, field: 'app_id'},
  matchType: {type: Seq.STRING, field: 'match_type'},
  name: {type: Seq.STRING},
  nameLen: {type: Seq.INTEGER, field: 'name_len'},
  priority: {type: Seq.INTEGER},
  action: {type: Seq.STRING},
  permID: {type: Seq.STRING, field: 'perm_id'},
  createTime: {type: Seq.INTEGER, field: 'create_time'},
  updateTime: {type: Seq.INTEGER, field: 'update_time'},
}, {
  freezeTableName: true,
})

module.exports = model
