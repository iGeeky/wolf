const Koa = require('koa')
const json = require('koa-json')
const cors = require('koa2-cors')
const staticServer = require('koa-static')
require('./src/util/init-root-user')
const bodyparser = require('koa-bodyparser')
const logger = require('koa-logger')
const router = require('./src/routes/router')
const log4js = require('./src/util/log4js')
const errorCatch = require('./src/middlewares/error-catch')
const tokenCheck = require('./src/middlewares/token-check')
const accessLog = require('./src/middlewares/access-log')
const rbacTokenCheck = require('./src/middlewares/rbac-token-check')
const locale = require('koa-locale') //  detect the locale
const i18n = require('koa-i18n')
const app = new Koa()
const views = require('koa-views')
const path = require('path')

locale(app)

process.on('uncaughtException', (err) => {
  /* istanbul ignore next */
  log4js.error('uncaughtException>>', err)
  // process.exit(0)
})
process.on('unhandledRejection', (reason, p) => {
  /* istanbul ignore next */
  log4js.error(reason)
  // process.exit(0)
})

let instance = null
try {
  app.on('error', (err, ctx) => {
    log4js.error('app error: %s', err)
  })

  app.use(logger((str, args) => {
    log4js.info(str, args)
  }))
  app.use(accessLog())
  app.use(views(path.join(__dirname, './tmpl'), {
    map: { html: 'ejs' },
  }))
  app.use(i18n(app, {
    directory: './conf/langs',
    locales: ['en', 'zh-CN'], //  `en` defualtLocale, must match the locales to the filenames
    modes: [
      // 'query', //  optional detect querystring - `/?locale=en-US`
      // 'subdomain', //  optional detect subdomain   - `zh-CN.koajs.com`
      'cookie', //  optional detect cookie      - `Cookie: locale=zh-TW`
      'header', //  optional detect header      - `Accept-Language: zh-CN,zh;q=0.5`
      // 'url', //  optional detect url         - `/en`
    ],
  }))
  app.use(cors({
    origin: (ctx) => {
      return '*'
    },
    maxAge: 5,
    credentials: true,
    allowMethods: ['GET', 'POST', 'DELETE', 'PUT', 'OPTIONS'],
  }))
  app.use(json())
  app.use(bodyparser({
    enableTypes: ['json', 'form', 'text'],
  }))
  app.use(errorCatch())
  app.use(tokenCheck())
  app.use(rbacTokenCheck())
  app.use(staticServer(path.join(__dirname, 'html')))
  app.use(router.routes())
  app.use(router.allowedMethods())
  const port = parseInt(process.env.PORT, 10) || 12180
  instance = app.listen(port)
  log4js.info('listen at 0.0.0.0:%s success!', port)
} catch (ex) {
  /* istanbul ignore next */
  log4js.error('app global catch', ex)
}

module.exports = instance
