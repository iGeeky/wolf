
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

router.all('/wolf/ping', async (ctx, next) => {
  ctx.body = json.ok({server: 'rbac', now: util.currentDate()})
})

router.all(('/wolf/:service/:bizMethod'), async (ctx, next) => {
  const service = ctx.params.service; // get the service from uri.
  let method = ctx.request.method
  const originalBizMethod = ctx.params.bizMethod; // get the bizMethod from uri.
  const bizMethod = _.camelCase(originalBizMethod.replace('\.', '_'))
  const bizMethodEx = _.camelCase((originalBizMethod + '_' + method).replace('\.', '_'))
  log4js.info('service: %s call bizMethod [%s] or [%s]', service, bizMethod, bizMethodEx)
  const requestClass = routers.get(service);
  if (!requestClass) {
    ctx.status = 404;
    ctx.body = json.fail('ERR_REQUEST_NOT_FOUND')
    return;
  }
  const serviceInstance = new requestClass(ctx)
  serviceInstance.setNext(next)
  await serviceInstance.do(bizMethod, bizMethodEx)
})

router.all(('/wolf/:service'), async (ctx, next) => {
  const service = ctx.params.service.toLowerCase(); // get the service from uri
  let bizMethod = ctx.request.method
  bizMethod = _.camelCase(bizMethod.replace('\.', '_'))
  log4js.info('service: %s call bizMethod [%s]', service, bizMethod)
  const requestClass = routers.get(service);
  if (!requestClass) {
    ctx.status = 404;
    ctx.body = json.fail('ERR_REQUEST_NOT_FOUND')
    return;
  }
  const serviceInstance = new requestClass(ctx)
  serviceInstance.setNext(next)
  await serviceInstance.do(bizMethod)
})

module.exports = router
