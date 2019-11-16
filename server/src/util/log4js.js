const log4js = require('log4js');
const objConfig = require('../../conf/log4js.json')
log4js.configure(objConfig);
module.exports = log4js.getLogger('server')