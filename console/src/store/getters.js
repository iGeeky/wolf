const getters = {
  sidebar: state => state.app.sidebar,
  size: state => state.app.size,
  device: state => state.app.device,
  visitedViews: state => state.tagsView.visitedViews,
  cachedViews: state => state.tagsView.cachedViews,
  token: state => state.user.token,
  userInfo: state => state.user.userInfo,
  avatar: state => state.user.userInfo.avatar || '',
  name: state => state.user.userInfo.username,
  applications: state => state.user.applications || [],
  appIds: state => state.user.userInfo.appIDs || [],
  roles: state => state.user.roles,
  globalRoutes: state => state.permission.routes,
  currentApp: state => state.currentApp.currentApp,
}
export default getters
