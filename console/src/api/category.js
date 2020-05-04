import request from '@/utils/request'
import { checkExist } from '@/api/common'

export async function addCategory(category) {
  return await request({
    url: '/category',
    method: 'post',
    data: category,
  })
}

export async function updateCategory(id, category) {
  category = Object.assign({ id }, category)
  return await request({
    url: '/category',
    method: 'put',
    data: category,
  })
}

export async function deleteCategory(id) {
  const data = { id }
  return await request({
    url: '/category',
    method: 'delete',
    data,
  })
}

export async function listCategorys(args) {
  return await request({
    url: '/category/list',
    method: 'get',
    params: args,
  })
}

export async function checkCategoryNameExist(appID, name, excludeId) {
  const value = { appID, name }
  const exclude = { }
  if (excludeId) {
    exclude.id = excludeId
  }
  const status = await checkExist('category', value, exclude)
  return status
}

