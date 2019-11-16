const Sequelize = require('../util/sequelize')
const Seq = require('sequelize');

const model = Sequelize.define('application', {
  id: {
    type: Seq.STRING,
    primaryKey: true,
  },
  name: {type: Seq.STRING},
  description: {type: Seq.STRING},
  createTime: {type: Seq.INTEGER, field: 'create_time'},
  updateTime: {type: Seq.INTEGER, field: 'update_time'},
}, {
  freezeTableName: true,
})

module.exports = model
