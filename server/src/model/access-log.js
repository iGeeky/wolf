const Sequelize = require('../util/sequelize')
const Seq = require('sequelize');

const model = Sequelize.define('access_log', {
  id: {
    type: Seq.BIGINT,
    autoIncrement: true,
    primaryKey: true,
  },
  appID: {type: Seq.STRING, field: 'app_id'},
  userID: {type: Seq.BIGINT, field: 'user_id'},
  username: {type: Seq.STRING},
  nickname: {type: Seq.STRING},
  action: {type: Seq.STRING},
  resName: {type: Seq.STRING, field: 'res_name'},
  matchedResource: {type: Seq.JSONB, field: 'matched_resource'},
  status: {type: Seq.SMALLINT},
  body: {type: Seq.JSONB},
  contentType: {type: Seq.STRING, field: 'content_type'},
  date: {type: Seq.STRING},
  accessTime: {type: Seq.INTEGER, field: 'access_time'},
  ip: {type: Seq.STRING},
}, {
  freezeTableName: true,
})

module.exports = model
