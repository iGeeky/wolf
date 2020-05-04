import request from '@/utils/request'
import { checkExist } from '@/api/common'

export async function addResource(resource) {
  return await request({
    url: '/resource',
    method: 'post',
    data: resource,
  })
}

export async function updateResource(id, resource) {
  resource = Object.assign({ id }, resource)
  return await request({
    url: '/resource',
    method: 'put',
    data: resource,
  })
}

export async function deleteResource(id) {
  const data = { id: id }
  return await request({
    url: '/resource',
    method: 'delete',
    data,
  })
}

export async function listResources(args) {
  return await request({
    url: '/resource/list',
    method: 'get',
    params: args,
  })
}

export async function checkResourceExist(resource) {
  const { appID, matchType, name, action, id } = resource
  const value = { appID, matchType, name, action }
  const exclude = { }
  if (id) {
    exclude.id = id
  }
  const status = await checkExist('resource', value, exclude)
  return status
}

