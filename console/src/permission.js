import router, { resetRouter } from '@/router'

import store from './store'
import NProgress from 'nprogress' // progress bar
import 'nprogress/nprogress.css' // progress bar style
import { getToken } from '@/utils/auth' // get token from cookie
import getPageTitle from '@/utils/get-page-title'

NProgress.configure({ showSpinner: false }) // NProgress Configuration
async function initMenu() {
  NProgress.start()
  const hasToken = getToken()
  if (hasToken) {
    await store.dispatch('user/getInfo')
  }
  resetRouter()
  // generate accessible routes map based on roles
  await store.dispatch('permission/generateRoutes', null)
  NProgress.done()
}
initMenu().then(() => {})

const whiteList = ['/login', '/auth-redirect'] // no redirect whitelist

router.beforeEach(async(to, from, next) => {
  // start progress bar
  NProgress.start()

  // set page title
  document.title = getPageTitle(to.meta.title)

  // determine whether the user has logged in
  const hasToken = getToken()
  const toPath = to.path || '/'

  if (hasToken) {
    if (from.path === '/login') {
      // if is logged in, redirect to the home page
      resetRouter()
      // generate accessible routes map based on roles
      await store.dispatch('permission/generateRoutes', null)
      next()
    } else {
      next()
    }
    NProgress.done()
  } else {
    /* has no token*/
    if (whiteList.indexOf(toPath) !== -1) {
      // in the free login whitelist, go directly
      next()
    } else {
      // other pages that do not have permission to access are redirected to the login page.
      next(`/login?redirect=${toPath}`)
    }
    NProgress.done()
  }
})

router.afterEach(() => {
  // finish progress bar
  NProgress.done()
})
