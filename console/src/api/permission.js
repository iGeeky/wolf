import request from '@/utils/request'
import i18n from '@/i18n/i18n'
import { checkExist } from '@/api/common'

export async function addPermission(permission) {
  return await request({
    url: '/permission',
    method: 'post',
    data: permission,
  })
}

export async function updatePermission(id, permission) {
  permission = Object.assign({ id }, permission)
  return await request({
    url: '/permission',
    method: 'put',
    data: permission,
  })
}

export async function deletePermission(id, appID) {
  const data = { id, appID }
  return await request({
    url: '/permission',
    method: 'delete',
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

export async function getSysPermissions() {
  const denyAll = { id: 'DENY_ALL', name: i18n.t('wolf.labelDenyAll') }
  const allowAll = { id: 'ALLOW_ALL', name: i18n.t('wolf.labelAllowAll') }
  return [denyAll, allowAll]
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

