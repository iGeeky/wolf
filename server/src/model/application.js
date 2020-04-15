const Sequelize = require('../util/sequelize')
const Seq = require('sequelize')

const model = Sequelize.define('application', {
  id: {
    type: Seq.STRING,
    primaryKey: true,
  },
  name: { type: Seq.STRING },
  secret: { type: Seq.STRING },
  redirectUris: { type: Seq.ARRAY(Seq.STRING), field: 'redirect_uris' },
  grants: { type: Seq.ARRAY(Seq.STRING), field: 'grants' },
  accessTokenLifetime: { type: Seq.INTEGER, field: 'access_token_lifetime' },
  refreshTokenLifetime: { type: Seq.INTEGER, field: 'refresh_token_lifetime' },
  description: { type: Seq.STRING },
  createTime: { type: Seq.INTEGER, field: 'create_time' },
  updateTime: { type: Seq.INTEGER, field: 'update_time' },
}, {
  freezeTableName: true,
})

module.exports = model
