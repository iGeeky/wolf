import request from '@/utils/request'

export async function setUserRole(userRole) {
  return await request({
    url: '/user-role/set',
    method: 'post',
    data: userRole,
  })
}

export async function deleteUserRole(userId, appId) {
  const data = { userID: userId, appID: appId }
  return await request({
    url: '/user-role/delete',
    method: 'post',
    data,
  })
}

export async function getUserRole(userId, appId) {
  const args = { userID: userId, appID: appId }
  return await request({
    url: '/user-role/get',
    method: 'get',
    params: args,
  })
}
