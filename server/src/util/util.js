
const _ = require('lodash')
const bcrypt = require('bcrypt-node')
const moment = require('moment')

function randomString(length) {
  let result = ''
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const charactersLength = characters.length
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength))
  }
  return result
}

function encodePassword(srcPassword) {
  return bcrypt.hashSync(srcPassword, bcrypt.genSaltSync(8))
}

function comparePassword(rawPassword, encodePassword) {
  return bcrypt.compareSync(rawPassword, encodePassword)
}

function currentDate(format = 'YYYY-MM-DD HH:mm:ss') {
  return moment().format(format)
}

function unixtime(strDate = undefined) {
  return moment(strDate).unix()
}

function fromUnixtime(unixtime, format = 'YYYY-MM-DD HH:mm:ss') {
  /* istanbul ignore next */
  return moment.unix(unixtime).format(format)
}

function getDate(strDate) {
  /* istanbul ignore next */
  return moment(strDate).format('YYYY-MM-DD')
}

// object to filter
// fileds in list like: ['name', 'age']
function filterFieldWhite(obj, whiteFields) {
  return _.pick(obj, whiteFields)
}

function filterFieldBlack(obj, blackFields) {
  /* istanbul ignore next */
  return _.pickBy(obj, (val, key) => _.findIndex(blackFields, (v) => v === key) === -1)
}

exports.encodePassword = encodePassword
exports.comparePassword = comparePassword
exports.currentDate = currentDate
exports.unixtime = unixtime
exports.getDate = getDate
exports.fromUnixtime = fromUnixtime
exports.filterFieldWhite = filterFieldWhite
exports.filterFieldBlack = filterFieldBlack
exports.randomString = randomString
