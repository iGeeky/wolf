import { login, getInfo } from '@/api/user'
import { getToken, setToken, removeToken } from '@/utils/auth'
import { resetRouter } from '@/router'
const _ = require('lodash'
)
const state = {
  token: getToken(),
  roles: [],
  userInfo: {},
  applications: [],
}

const mutations = {
  SET_TOKEN: (state, token) => {
    state.token = token
  },

  SET_USER_INFO: (state, userInfo) => {
    state.userInfo = userInfo
  },
  SET_APPLICATIONS: (state, applications) => {
    state.applications = applications
  },

}

function checkCurrentApp(applications, rootState, dispatch) {
  if (!applications || applications.length === 0) {
    dispatch('currentApp/setCurrentApp', '', { root: true })
    console.log('>>>>>> applications is empty, clean the currentApp setting.')
  }
  const currentApp = rootState.currentApp.currentApp
  if (currentApp) {
    const applicationExist = _.find(applications, { 'id': currentApp })
    if (!applicationExist) {
      dispatch('currentApp/setCurrentApp', applications[0].id, { root: true })
      console.log('>>>>>> currentApp reset to %s.', applications[0])
    }
  }
}

const actions = {
  // user login
  login({ commit, rootState, dispatch }, userInfo) {
    const { username, password } = userInfo
    return new Promise((resolve, reject) => {
      login({ username: username.trim(), password: password }).then(res => {
        if (res.ok) {
          const { data } = res

          let applications = data.applications
          if (!applications || applications.length === 0) {
            applications = [{ id: -1, name: 'none', description: 'no application' }]
          }
          commit('SET_TOKEN', data.token)
          commit('SET_USER_INFO', data.userInfo)
          commit('SET_APPLICATIONS', applications)
          checkCurrentApp(applications, rootState, dispatch)
          setToken(data.token)
        }
        resolve()
      }).catch(error => {
        reject(error)
      })
    })
  },

  // get user info
  getInfo({ commit, state, rootState, dispatch }) {
    return new Promise((resolve, reject) => {
      getInfo(state.token).then(response => {
        const { data } = response

        if (!data) {
          reject('Verification failed, please Login again.')
        }

        let applications = data.applications
        if (!applications || applications.length === 0) {
          applications = [{ id: -1, name: 'none', description: 'no application' }]
        }
        // commit('SET_ROLES', roles)
        commit('SET_USER_INFO', data.userInfo)
        commit('SET_APPLICATIONS', applications)
        checkCurrentApp(applications, rootState, dispatch)
        resolve(data)
      }).catch(error => {
        reject(error)
      })
    })
  },

  // user logout
  logout({ commit, state }) {
    return new Promise((resolve, reject) => {
      // logout(state.token).then(() => {
      commit('SET_TOKEN', '')
      // commit('SET_ROLES', [])
      removeToken()
      resetRouter()
      resolve()
      // }).catch(error => {
      //   reject(error)
      // })
    })
  },

  // remove token
  resetToken({ commit }) {
    return new Promise(resolve => {
      commit('SET_TOKEN', '')
      // commit('SET_ROLES', [])
      removeToken()
      resolve()
    })
  },
}

export default {
  namespaced: true,
  state,
  mutations,
  actions,
}
