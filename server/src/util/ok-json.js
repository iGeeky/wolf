
function _json(ok, reason, errmsg, data) {
  const jso = { ok }
  if (reason) {
    jso.reason = reason
  } else {
    jso.reason = ''
  }
  if (errmsg) {
    jso.errmsg = errmsg
  }
  if (data) {
    jso.data = data
  }
  return jso
}

function json(ok, reason, data) {
  return _json(ok, reason, undefined, data)
}

function ok(data) {
  return _json(true, undefined, undefined, data)
}

function fail(reason, errmsg, data) {
  return _json(false, reason, errmsg, data)
}

exports.json = json
exports.ok = ok
exports.fail = fail
