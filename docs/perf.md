
## Executing performance tests

Performance test scripts, so far only the `/wolf/rbac/access_check` interface has been tested. This is also the main interface called by `agent`.

On my laptop, the QPS is over `240`. My laptop configuration is as follows:

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
    Latency   279.19ms  475.77ms   2.00s    85.09%
    Req/Sec     9.97     12.38   230.00     93.41%
  14461 requests in 1.00m, 14.53MB read
  Socket errors: connect 0, read 0, write 0, timeout 1517
  Non-2xx or 3xx responses: 3335
Requests/sec:    240.61
```
