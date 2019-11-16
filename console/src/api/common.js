import request from '@/utils/request'

export async function checkExist(model, value, exclude) {
  const data = { value }
  if (exclude) {
    data.exclude = exclude
  }
  const res = await request({
    url: `/${model}/checkExist`,
    method: 'POST',
    data: data,
  })
  if (res.ok) {
    return { ok: res.ok, exist: res.data.exist }
  } else {
    return { ok: false, exist: false }
  }
}
