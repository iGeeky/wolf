
## 执行性能测试

性能测试脚本,目前仅测试了`/wolf/rbac/access_check`接口. 这也是`agent`调用的主要接口.

在我的笔记本上,QPS超过`320`, 服务配置不记录访问日志时, QPS超过`1200`. 我的笔记本配置如下:

* Macbook 2016
* 处理器: 2.9 GHz 双核Intel Core i5
* 内存: 16 GB 2133 MHz LPDDR3


### 准备工作

确保`wolf-server`启动正常

### 初始化测试数据

```
cd wolf/server
./node_modules/mocha/bin/mocha --timeout 10000 \
test/init/0-rbac-init.js --server 'http://127.0.0.1:12180' \
--policyFile ./test/init/0-rbac-data-or.md --userPassword 123456
```

### 获取登录token

```
# 使用接口登录.
curl http://127.0.0.1:12180/wolf/rbac/login.rest \
-H"Content-Type: application/json" \
-d '{"username": "or_cn", "password": "123456", "appid": "openresty"}'

# 如果登录成功, 返回内容大概如下:
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

# 将登录返回的token设置成环境变量`TOKEN`
export TOKEN="eyJhbGciOiJIUzI1 ...... XDOnHNqeq5VcnjE"
```

### 执行测试脚本

```shell
wrk -c 128 -t 64 -d 60 -s test/perf.lua http://127.0.0.1:12180
```

下面是输出结果.

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

不记录访问日志,输出结果:

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
