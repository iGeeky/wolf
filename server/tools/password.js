const argv = require('minimist')(process.argv.slice(2))
const util = require('../src/util/util')

const password = argv.password || '123456'
const encryptPassword = util.encodePassword(password)
console.log('password [%s] encrypted: %s', password, encryptPassword)

