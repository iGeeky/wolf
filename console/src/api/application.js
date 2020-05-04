import request from '@/utils/request'
import { checkExist } from '@/api/common'

export async function addApplication(application) {
  return await request({
    url: '/application',
    method: 'post',
    data: application,
  })
}

export async function updateApplication(id, application) {
  application = Object.assign({ id }, application)
  return await request({
    url: '/application',
    method: 'put',
    data: application,
  })
}

export async function deleteApplication(id) {
  const data = { id: id }
  return await request({
    url: '/application',
    method: 'delete',
    data,
  })
}

export async function listApplications(args) {
  return await request({
    url: '/application/list',
    method: 'get',
    params: args,
  })
}

export async function getSecret(args) {
  return await request({
    url: '/application/secret',
    method: 'get',
    params: args,
  })
}

export async function applicationDiagram(id) {
  const args = { id }
  return await request({
    url: '/application/diagram',
    method: 'get',
    params: args,
  })
}

export async function allApplications() {
  return await request({
    url: '/application/listAll',
    method: 'get',
  })
}

export async function checkAppIdExist(id) {
  const value = { id }
  const status = await checkExist('application', value)
  return status
}

export async function checkAppNameExist(name, excludeAppId) {
  const value = { name }
  const exclude = { }
  if (excludeAppId) {
    exclude.id = excludeAppId
  }
  const status = await checkExist('application', value, exclude)
  return status
}

