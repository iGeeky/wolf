import request from '@/utils/request'
import { checkExist } from '@/api/common'

export async function addPermission(permission) {
  return await request({
    url: '/permission/add',
    method: 'post',
    data: permission,
  })
}

export async function updatePermission(id, permission) {
  permission = Object.assign({ id }, permission)
  return await request({
    url: '/permission/update',
    method: 'post',
    data: permission,
  })
}

export async function deletePermission(id) {
  const data = { id }
  return await request({
    url: '/permission/delete',
    method: 'post',
    data,
  })
}

export async function listPermissions(args) {
  return await request({
    url: '/permission/list',
    method: 'get',
    params: args,
  })
}

export async function checkPermissionIDExist(appID, id) {
  const value = { appID, id }
  const exclude = { }
  const status = await checkExist('permission', value, exclude)
  return status
}

export async function checkPermissionNameExist(appID, name, excludeId) {
  const value = { appID, name }
  const exclude = { }
  if (excludeId) {
    exclude.id = excludeId
  }
  const status = await checkExist('permission', value, exclude)
  return status
}

