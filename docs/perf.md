
## Executing performance tests

Performance test scripts, so far only the `/wolf/rbac/access_check` interface has been tested. This is also the main interface called by `agent`.

On my laptop, QPS is more than `320`, and when the service is configured not to record access logs, QPS is more than `1200`. My laptop is configured as follows:

* Macbook 2016
* Processor: 2.9 GHz dual-core Intel Core i5
* Memory: 16 GB 2133 MHz LPDDR3


### Preparation

Make sure `wolf-server` starts properly

### Initialize test data

```
cd wolf/server
./node_modules/mocha/bin/mocha --timeout 10000 \
test/init/0-rbac-init.js --server 'http://127.0.0.1:12180' \
--policyFile ./test/init/0-rbac-data-or.md --userPassword 123456
```

### Get login token

```
# Login using the api.
curl http://127.0.0.1:12180/wolf/rbac/login.rest \
-H"Content-Type: application/json" \
-d '{"username": "or_cn", "password": "123456", "appid": "openresty"}'

# If the login is successful, the return will look like this:
{
  "ok": true,
  "reason": "",
  "data": {
    "userInfo": {
      "id": 863,
      "username": "or_cn",
      "nickname": "openresty-chinese"
    },
    "token": "eyJhbGciOiJIUzI1 ...... XDOnHNqeq5VcnjE"
  }
}

# Set the token returned by the login to the environment variable `TOKEN`
export TOKEN="eyJhbGciOiJIUzI1 ...... XDOnHNqeq5VcnjE"
```

### Execute test scripts

```shell
wrk -c 128 -t 64 -d 60 -s test/perf.lua http://127.0.0.1:12180
```

Here is the output.

```
 Running 1m test @ http://127.0.0.1:12180
  64 threads and 128 connections
  Thread Stats   Avg      Stdev     Max   +/- Stdev
    Latency   339.56ms  497.72ms   2.00s    80.46%
    Req/Sec    13.78     19.22   290.00     91.58%
  19422 requests in 1.00m, 14.85MB read
  Socket errors: connect 0, read 0, write 0, timeout 1166
  Non-2xx or 3xx responses: 13790
Requests/sec:    323.18
Transfer/sec:    252.99KB
```

No record of access logs, output results:

```
Running 1m test @ http://127.0.0.1:12180
  64 threads and 128 connections
  Thread Stats   Avg      Stdev     Max   +/- Stdev
    Latency   108.67ms  109.37ms   1.16s    91.76%
    Req/Sec    23.55      9.80   111.00     68.61%
  82521 requests in 1.00m, 63.31MB read
  Socket errors: connect 0, read 0, write 0, timeout 128
  Non-2xx or 3xx responses: 61176
Requests/sec:   1373.25
Transfer/sec:      1.05MB
```
