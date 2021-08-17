const config = require('../../conf/config')
const Op = require('sequelize').Op
const isMysql = config.database.url.substring(0, 8) === 'mysql://'

function arrayContains(value) {
  let queryItem
  if (isMysql) {
    queryItem = { [Op.like]: '%' + value + '%' }
  } else {
    queryItem = { [Op.contains]: [value] }
  }
  return queryItem
}

function like(field, value) {
  return { [field]: { [Op.like]: '%' + value + '%' }}
}

exports.arrayContains = arrayContains
exports.like = like
