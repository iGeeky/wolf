import request from '@/utils/request'

export async function listAccessLogs(args) {
  return await request({
    url: '/access-log/list',
    method: 'get',
    params: args,
  })
}
