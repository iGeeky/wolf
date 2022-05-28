import axios from 'axios'
import { Message } from 'element-ui'
import store from '@/store'
import { getToken } from '@/utils/auth'
import router from '@/router'
import i18n from '@/i18n/i18n'

// create an axios instance
const service = axios.create({
  baseURL: process.env.VUE_APP_BASE_API, // url = base url + request url
  // withCredentials: true, // send cookies when cross-domain requests
  timeout: 5000, // request timeout
})

// request interceptor
service.interceptors.request.use(
  config => {
    // do something before request is sent

    if (store.getters.token) {
      // let each request carry token
      // ['x-rbac-token'] is a custom headers key
      // please modify it according to the actual situation
      config.headers['x-rbac-token'] = getToken()
    }
    return config
  },
  error => {
    // do something with request error
    console.error(error) // for debug
    return Promise.reject(error)
  },
)

function getI18nMessage(errmsg, reason) {
  const keys = []
  console.log('reason: %s, errmsg: %s', reason, errmsg)

  const regex = /^[A-Za-z_0-9\.]+$/g
  if (errmsg && regex.test(errmsg)) {
    keys.push(errmsg)
  }
  if (reason && regex.test(reason)) {
    keys.push(reason)
  }
  let message
  for (const key of keys) {
    if (!key) {
      continue
    }
    const i18n_key = `wolf.error.${key}`
    message = i18n.t(i18n_key)
    if (message) {
      break
    }
  }
  if (!message) {
    message = errmsg || reason || 'unknow error'
  }
  return message
}

// response interceptor
service.interceptors.response.use(
  /**
   * If you want to get http information such as headers or status
   * Please return  response => response
  */

  /**
   * Determine the request status by custom code
   * Here is just an example
   * You can also judge the status by HTTP Status Code
   */
  response => {
    const res = response.data

    // if the custom code is not 20000, it is judged as an error.
    if (!res.ok) {
      const errmsg = getI18nMessage(res.errmsg, res.reason)
      Message({
        message: errmsg,
        type: 'error',
        duration: 8 * 1000,
      })
      return res
    } else {
      return res
    }
  },
  error => {
    console.error('axios request failed! ' + error) // for debug
    let errmsg = null
    let reason = null
    if (typeof (error.response.data) === 'object' && !error.response.data.ok && error.response.data.reason) {
      errmsg = error.response.data.errmsg
      reason = error.response.data.reason
      errmsg = getI18nMessage(errmsg, reason)
    } else {
      errmsg = `error: ${error.message}`
    }
    Message({
      message: errmsg,
      type: 'error',
      duration: 5 * 1000,
    })

    if (reason === 'ERR_TOKEN_INVALID') {
      // store.dispatch('user/logout')
      const toPath = router.fullPath || '/'
      router.push(`/login?redirect=${toPath}`)
    }
    return Promise.reject(error)
  },
)

export default service
