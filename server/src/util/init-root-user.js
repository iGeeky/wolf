const config = require('../../conf/config')
const UserModel = require('../model/user')
const util = require('./util')

/* istanbul ignore next */
async function createUser(username, nickname, manager) {
  const user = await UserModel.findOne({where: {username}})
  if (user) {
    console.log('user [%s] is exist!', username);
    return;
  }
  const password = config.rootUserInitialPassword || util.randomString(12)
  const values = {username, nickname, manager}
  values.password = util.encodePassword(password);
  values.status = 0;
  values.lastLogin = 0;
  values.createTime = util.unixtime();
  values.updateTime = util.unixtime();
  await UserModel.create(values);
  console.log('system user [%s] created, the password is %s.', username, password)
}

async function addRootUser() {
  await createUser('root', 'root(super man)', 'super')
  await createUser('admin', 'administrator', 'admin')
}

setTimeout(()=> {
  addRootUser().then(() => {

  }).catch((err) => {
    console.log('create root user failed! err: %s', err)
  })
}, 1000 * 1);
