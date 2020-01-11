
function json(ok, reason, data) {
  const jso = { ok }
  if (reason) {
    jso.reason = reason
  } else {
    jso.reason = ''
  }
  if (data) {
    jso.data = data
  }
  return jso
}

function ok(data) {
  return json(true, null, data)
}

function fail(reason, data) {
  return json(false, reason, data)
}

exports.json = json
exports.ok = ok
exports.fail = fail
