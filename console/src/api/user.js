import request from '@/utils/request'
import { checkExist } from '@/api/common'

export async function addUser(userInfo) {
  return await request({
    url: '/user',
    method: 'post',
    data: userInfo,
  })
}

export async function updateUser(id, userInfo) {
  userInfo = Object.assign({ id }, userInfo)
  return await request({
    url: '/user',
    method: 'put',
    data: userInfo,
  })
}

export async function deleteUser(id) {
  const data = { id }
  return await request({
    url: '/user',
    method: 'delete',
    data,
  })
}

export async function resetPwd(id) {
  const data = { id }
  return await request({
    url: '/user/reset_pwd',
    method: 'put',
    data,
  })
}

export async function login(data) {
  return await request({
    url: '/user/login',
    method: 'post',
    data,
  })
}

export async function getInfo() {
  return await request({
    url: '/user/info',
    method: 'get',
    params: { },
  })
}

export async function listUsers(args) {
  return await request({
    url: '/user/list',
    method: 'get',
    params: args,
  })
}

export async function logout() {
  return await request({
    url: '/user/logout',
    method: 'post',
  })
}

export async function checkUsernameExist(username, excludeUserId) {
  const value = { username }
  const exclude = { }
  if (excludeUserId) {
    exclude.id = excludeUserId
  }
  const status = await checkExist('user', value, exclude)
  return status
}
