
const _ = require('lodash')
const bcrypt = require('bcrypt')
const moment = require('moment');

function randomString(length) {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  for ( let i = 0; i < length; i++ ) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}


function encodePassword(srcPassword) {
  return bcrypt.hashSync(srcPassword, bcrypt.genSaltSync(8));
}

function comparePassword(rawPassword, encodePassword) {
  return bcrypt.compareSync(rawPassword, encodePassword)
}

function currentDate(format='YYYY-MM-DD HH:mm:ss') {
  return moment().format(format);
}

function unixtime(strDate=undefined) {
  return moment(strDate).unix();
}

function fromUnixtime(unixtime, format='YYYY-MM-DD HH:mm:ss') {
  return moment.unix(unixtime).format(format)
}

function getDate(strDate) {
  return moment(strDate).format('YYYY-MM-DD')
}

/**
 * 将url_perm_set 格式, 解析成: [{action: url_perm, method:set}, {action: url, method: perm_set}]
 * @param {string} path
 * @return {list} [{action: url_perm, method:set}, {action: url, method: perm_set}]
 */
function splitPath(path) {
  const items = path.split('_')
  const actions = [];
  for (let i=items.length-1; i >=1; i--) {
    const action = _.join(_.slice(items, 0, i), '_');
    const method = _.join(_.slice(items, i), '_');
    actions.push({action, method})
  }
  return actions;
}
// object to filter
// fileds in list like: ['name', 'age']
function filterFieldWhite(obj, whiteFields) {
  return _.pick(obj, whiteFields);
}

function filterFieldBlack(obj, blackFields) {
  return _.pickBy(obj, (val, key) => _.findIndex(blackFields, (v) => v===key) === -1)
}


exports.encodePassword = encodePassword;
exports.comparePassword = comparePassword;
exports.currentDate = currentDate;
exports.unixtime = unixtime;
exports.getDate = getDate
exports.fromUnixtime = fromUnixtime;
exports.splitPath = splitPath;
exports.filterFieldWhite = filterFieldWhite;
exports.filterFieldBlack = filterFieldBlack;
exports.randomString = randomString;
