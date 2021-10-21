import Cookies from 'js-cookie'

const TokenKey = 'AdminToken'

export function getToken() {
  const token = Cookies.get(TokenKey)
  // console.log('>>> getToken: %s', token)
  return token
}

export function setToken(token) {
  console.log('>>> setToken: %s', token)
  return Cookies.set(TokenKey, token)
}

export function removeToken() {
  console.log('>>> removeToken ######## ')
  return Cookies.remove(TokenKey)
}
