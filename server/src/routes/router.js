
const Router = require('koa-router')
const log4js = require('../util/log4js')
const util = require('../util/util')
const json = require('../util/ok-json')
const _ = require('lodash')
const routers = new Map();
const controllerDir = '../controllers/'
const controllerPath = require('path').join(__dirname, controllerDir);
require('fs').readdirSync(controllerPath).forEach(function(filename) {
  // filter directory
  if (filename.indexOf('.') > 0) {
    const serviceName = filename.substr(0, filename.indexOf('.'))
    log4js.info('load api service: [%s] from [%s]', serviceName, filename)
    routers.set(serviceName, require(controllerDir + filename));
  }
});

const router = new Router();

router.all('/api/v1/ping', async (ctx, next) => {
  ctx.body = json.ok({server: 'rbac', now: util.currentDate()})
})

router.all(('/api/v1/:action/:method'), async (ctx, next) => {
  const action = ctx.params.action; // get the action from uri.
  let method = ctx.params.method; // get the method from uri.
  method = _.camelCase(method.replace('\.', '_'))
  log4js.info('action: %s call method [%s]', action, method)
  const requestClass = routers.get(action);
  if (!requestClass) {
    ctx.status = 404;
    ctx.body = json.fail('ERR_REQUEST_NOT_FOUND')
    return;
  }
  const service = new requestClass(ctx)
  await service.do(method)
})

router.all(('/api/v1/:action'), async (ctx, next) => {
  const action = ctx.params.action.toLowerCase(); // get the action from uri
  let method = ctx.request.method
  method = _.camelCase(method.replace('\.', '_'))
  log4js.info('action: %s call method [%s]', action, method)
  const requestClass = routers.get(action);
  if (!requestClass) {
    ctx.status = 404;
    ctx.body = json.fail('ERR_REQUEST_NOT_FOUND')
    return;
  }
  const service = new requestClass(ctx)
  await service.do(method)
})

module.exports = router
