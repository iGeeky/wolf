const chai = require('chai');
chai.use(require('chai-json-schema'));
const assert = chai.assert
const json = require('./json')
const schemaGen = require('./schema-gen')
const argv = require('minimist')(process.argv.slice(2));

let request = null;
let server = null;

// --server 'http://127.0.0.1:10080'
if (argv.server) { // remote mode. access by chai-http
  const chaiHttp = require('chai-http')
  chai.use(chaiHttp);
  request = chai.request
  server = argv.server
} else { // local mode, access by supertest.
  request = require('supertest')
  if (!process.env.PORT) {
    process.env.PORT = 12386;
  }
  server = require('../../app.js')
}

function isArray(value) {
  return typeof (value) === 'object' && Array.isArray(value)
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
    if (headers.redirects !== undefined) {
      req.redirects(headers.redirects)
    }
  }
  return req
}

async function httpRequest(method, url, headers, args, body) {
  let data = null;
  if (typeof(body) === 'object') {
    data = JSON.stringify(body)
  } else {
    data = body;
  }
  const req = request(server)[method](url)
  setHeaders(req, headers)
  let res = {}
  if (method === 'get' && args) {
    res = await req.query(args)
  } else {
    res = await req.send(data)
  }
  return res
}

async function httpPost(url, headers, body) {
  return await httpRequest('post', url, headers, undefined, body)
}

async function httpGet(url, headers, args) {
  return await httpRequest('get', url, headers, args, undefined)
}

async function checkResponse(res, status, schema, match, notMatch, showSchema) {
  if (argv.schema || showSchema) {
    const deep = argv.deep || 4;
    const method = res.req.method;
    const path = res.req.path;
    console.log('/************** request: [%s %s] ****************/', method, path)
    if(res.body && res.body.data) {
      console.log('/***************** schema of data(deep: %d) ******************/', deep)
      const schema = schemaGen.autoSchema(res.body.data, {deep})
      console.log(json.dumps(schema))
    } else {
      const schema = schemaGen.autoSchema(res.body, {deep})
      console.log(json.dumps(schema))
    }
  }

  if (status == undefined) {
    status = 200
  }
  if (status) {
    assert.equal(res.status, status, `expect status (${status}), but res.status (${res.status})`);
  }

  let body = res.text
  if (res.status === 302 || res.status === 301) {
    body = `location:${res.headers['location']}`
    // console.log('request: [%s %s] status: %s, Set body to the value of Location.',
    // res.req.method, res.req.path, res.status)
  }

  if (match) {
    if (isArray(match)) {
      for (const pattern of match) {
        assert.match(body, new RegExp(pattern), `response text not matched regex: ${pattern}`)
      }
    } else {
      const pattern = match;
      assert.match(body, new RegExp(pattern), `response text not matched regex: ${pattern}`)
    }
  }
  if (notMatch) {
    if (isArray(notMatch)) {
      for (const pattern of notMatch) {
        assert.notMatch(body, new RegExp(pattern), `response text matched regex: ${pattern}`)
      }
    } else {
      const pattern = notMatch;
      assert.notMatch(body, new RegExp(pattern), `response text matched regex: ${pattern}`)
    }
  }

  if (schema) {
    assert.jsonSchema(res.body, schema, `res.body[[${JSON.stringify(res.body)}]]`)
  }
}

const methods = {
  get: true, put: true, post: true, delete: true,
}

/**
   * http request by chai-http or supertest
   * @param {!options} options request options
   *        method: http method, supported: get,put,post,delete.
   *        url: request url
   *        headers: request headers
   *        args: request args for get request
   *        body: request body for post,put,delete request.
   *        status: expect response status, default is 200.
   *        schema: expect response body schema for restful response
   *        match: regex pattern for matching response body.
   *        notMatch: regex pattern for not matching response body.
   * @return {res} http response object.
   */
async function http(options) {
  const {method, url, headers, args, body, status, schema, match, notMatch, showSchema} = options;
  assert(methods[method], `not support http method ${method}`)

  if (headers && typeof(headers) === 'object' && typeof(body) === 'object') {
    headers['Content-type'] = 'application/json; charset=utf-8'
  }
  const res = await httpRequest(method, url, headers, args, body)
  if (argv.log || options.log) {
    console.log('>>> request [%s %s] headers: %o, body: %o', 'POST', url, headers, body)
    console.log('>>> response status: %d, body: %o', res.status, res.body)
  }
  await checkResponse(res, status, schema, match, notMatch, showSchema)
  return res;
}

/**
   * http get request
   * @param {!options} options request options
   *        url: request url
   *        headers: request headers
   *        args: request args for get request
   *        status: expect response status, default is 200.
   *        schema: expect response body schema for restful response
   *        match: regex pattern for matching response body.
   *        notMatch: regex pattern for not matching response body.
   * @return {res} http response object.
   */
async function get(options) {
  options.method = 'get'
  return await http(options)
}

/**
   * http post request
   * @param {!options} options request options
   *        url: request url
   *        headers: request headers
   *        body: request body for post,put,delete request.
   *        status: expect response status, default is 200.
   *        schema: expect response body schema for restful response
   *        match: regex pattern for matching response body.
   *        notMatch: regex pattern for not matching response body.
   * @return {res} http response object.
   */
async function post(options) {
  options.method = 'post'
  return await http(options)
}

/**
   * http put request
   * @param {!options} options request options
   *        url: request url
   *        headers: request headers
   *        body: request body for post,put,delete request.
   *        status: expect response status, default is 200.
   *        schema: expect response body schema for restful response
   *        match: regex pattern for matching response body.
   *        notMatch: regex pattern for not matching response body.
   * @return {res} http response object.
   */
async function put(options) {
  options.method = 'put'
  return await http(options)
}

/**
   * http delete request
   * @param {!options} options request options
   *        url: request url
   *        headers: request headers
   *        body: request body for post,put,delete request.
   *        status: expect response status, default is 200.
   *        schema: expect response body schema for restful response
   *        match: regex pattern for matching response body.
   *        notMatch: regex pattern for not matching response body.
   * @return {res} http response object.
   */
async function delete_(options) {
  options.method = 'delete'
  return await http(options)
}


function onFailed(callback, args) {
  afterEach(function(){
    const {title, state, duration, err} = this.currentTest
    if (state !== 'passed') {
      const errmsg = `Test [${title}] ${state}, duration: ${duration}, err: ${err.message}`
      if(callback) {
        args = args || {}
        args.currentTest = this.currentTest
        callback(errmsg, args)
      }
    }
  })
}

exports.onFailed = onFailed;
exports.setHeaders = setHeaders;
exports.httpPost = httpPost;
exports.httpGet = httpGet;
exports.http = http;
exports.get = get;
exports.post = post;
exports.put = put;
exports.delete = delete_;