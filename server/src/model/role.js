const Sequelize = require('../util/sequelize')
const Seq = require('sequelize');

const model = Sequelize.define('role', {
  id: {
    type: Seq.STRING,
    primaryKey: true,
  },
  name: {type: Seq.STRING},
  description: {type: Seq.STRING},
  appID: {type: Seq.STRING, field: 'app_id'},
  permIDs: {type: Seq.ARRAY(Seq.STRING), field: 'perm_ids'},
  createTime: {type: Seq.INTEGER, field: 'create_time'},
  updateTime: {type: Seq.INTEGER, field: 'update_time'},
}, {
  freezeTableName: true,
})

module.exports = model
