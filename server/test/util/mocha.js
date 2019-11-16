const chai = require('chai');
const chaiHttp = require('chai-http')
chai.use(require('chai-json-schema'));
chai.use(chaiHttp);
const assert = chai.assert
const argv = require('minimist')(process.argv.slice(2));

let server = 'http://127.0.0.1:10080'
if (argv.host) {
  server = `http://${argv.host}`
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function setHeaders(req, headers) {
  if (headers) {
    for (const key in headers) {
      const value = headers[key]
      req.set(key, value)
    }
  }
  return req
}

async function httpPost(url, headers, body) {
  const data = JSON.stringify(body)
  const req = chai.request(server).post(url)
  setHeaders(req, headers)
  const res = await req.send(data)

  return res
}

async function httpGet(url, headers, args) {
  const req = chai.request(server).get(url)
  setHeaders(req, headers)
  const res = await req.query(args)
  return res
}

async function checkResponse(res, status, schema) {
  if (status == undefined) {
    status = 200
  }
  if (status) {
    assert.equal(res.status, status, `expect status (${status}), but res.status (${res.status})`);
  }
  if (schema) {
    // 由于响应的body可能没读取完, 这里做了等待.
    if (argv.encrypt) {
      const contentLength = res.headers['content-length']
      const sleepMs = 100
      for (let i=0; i < 20; i++) {
        if (res.recvLength >= contentLength) {
          break;
        }
        console.log('contentLength: %d, recvLength: %d, sleep(%s) for wait...', contentLength, res.recvLength, sleepMs)
        await sleep(sleepMs);
      }
    }
    assert.jsonSchema(res.body, schema, `res.body[[${JSON.stringify(res.body)}]]`)
  }
}

async function get(options) {
  const {url, headers, args, status, schema} = options;
  const res = await httpGet(url, headers, args)
  if (argv.log) {
    console.log('>>> request [%s %s] headers: %o, args: %o', 'GET', url, headers, args)
    console.log('>>> response status: %d, body: %o', res.status, res.body)
  }

  await checkResponse(res, status, schema)
  return res;
}

async function post(options) {
  const {url, headers, body, status, schema} = options;
  if (headers && typeof(headers) === 'object' && typeof(body) === 'object') {
    headers['Content-type'] = 'application/json; charset=utf-8'
  }
  const res = await httpPost(url, headers, body)
  if (argv.log) {
    console.log('>>> request [%s %s] headers: %o, body: %o', 'POST', url, headers, body)
    console.log('>>> response status: %d, body: %o', res.status, res.body)
  }
  await checkResponse(res, status, schema)
  return res;
}


exports.setHeaders = setHeaders;
exports.httpPost = httpPost;
exports.httpGet = httpGet;
exports.get = get;
exports.post = post;
