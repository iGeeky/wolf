import request from '@/utils/request'
import { checkExist } from '@/api/common'

export async function addRole(role) {
  return await request({
    url: '/role',
    method: 'post',
    data: role,
  })
}

export async function updateRole(id, role) {
  role = Object.assign({ id }, role)
  return await request({
    url: '/role',
    method: 'put',
    data: role,
  })
}

export async function deleteRole(id, appID) {
  const data = { id, appID }
  return await request({
    url: '/role',
    method: 'delete',
    data,
  })
}

export async function listRoles(args) {
  return await request({
    url: '/role/list',
    method: 'get',
    params: args,
  })
}

export async function checkRoleIDExist(appID, id) {
  const value = { appID, id }
  const exclude = { }
  const status = await checkExist('role', value, exclude)
  return status
}

export async function checkRoleNameExist(appID, name, excludeId) {
  const value = { appID, name }
  const exclude = { }
  if (excludeId) {
    exclude.id = excludeId
  }
  const status = await checkExist('role', value, exclude)
  return status
}

