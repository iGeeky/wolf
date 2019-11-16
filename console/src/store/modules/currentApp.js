import Cookies from 'js-cookie'

const state = {
  currentApp: Cookies.get('currentApp') || '',
}

const mutations = {
  SET_CURRENT_APP: (state, currentApp) => {
    state.currentApp = currentApp
    Cookies.set('currentApp', currentApp)
  },
}

const actions = {
  setCurrentApp({ commit }, currentApp) {
    commit('SET_CURRENT_APP', currentApp)
  },
}

export default {
  namespaced: true,
  state,
  mutations,
  actions,
}
