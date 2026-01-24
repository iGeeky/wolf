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

// 增加重试逻辑，确保数据库完全就绪后再创建用户
async function addRootUserWithRetry(maxRetries = 10, delayMs = 3000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await addRootUser();
      console.log('root user initialization completed successfully');
      return;
    } catch (err) {
      console.log('create root user failed (attempt %d/%d): %s', i + 1, maxRetries, err.message);
      if (i < maxRetries - 1) {
        console.log('waiting %d seconds before retry...', delayMs / 1000);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      } else {
        console.log('create root user failed after %d attempts! err: %s', maxRetries, err);
      }
    }
  }
}

// 初始延迟5秒，然后开始重试（最多10次，每次间隔3秒）
setTimeout(() => {
  addRootUserWithRetry(10, 3000);
}, 5000);
