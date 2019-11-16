const Sequelize = require('../util/sequelize')
const Seq = require('sequelize')
const Category = require('./category')

const model = Sequelize.define('permission', {
  id: {
    type: Seq.STRING,
    primaryKey: true,
  },
  appID: { type: Seq.STRING, field: 'app_id' },
  name: { type: Seq.STRING },
  description: { type: Seq.STRING },
  categoryID: { type: Seq.INTEGER, field: 'category_id'},
  createTime: { type: Seq.INTEGER, field: 'create_time'},
  updateTime: { type: Seq.INTEGER, field: 'update_time'},
}, {
  freezeTableName: true,
  underscored: true,
})

model.belongsTo(Category, { as: 'category' })

module.exports = model
