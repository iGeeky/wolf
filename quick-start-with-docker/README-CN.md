## 使用Docker快速起步

[Quick Start](./README.md)


#### 必要环境

* docker
* docker-compose
* 可选: git 或 wget



#### 启动与初始化

```bash
# 如果你的环境中没有安装git命令, 你也可以从github.com上手动下载本项目代码库.
git clone https://github.com/iGeeky/wolf.git

cd wolf/quick-start-with-docker

# 使用docker命令, 启动wolf系统.
docker-compose up -d database
# 启动docker容器
# 强烈建议您修改`docker-compose.yaml`中的 `RBAC_TOKEN_KEY` 及 `WOLF_CRYPT_KEY` 环境变量值, 使用默认设置可能会使系统处于风险之中.
docker-compose up -d server restful-demo agent-or agent-demo

# 初始化demo应用数据及账号数据.
# 该脚本从配置中读取了三个测试应用的数据, 并初始化到系统中.
# 初始化时有两种方式:
# 1: 不指定密码, 系统为每个测试用户生成一个随机密码. 这是推荐的方式.
sh wolf-demo-init.sh
# 2: 指定初始密码, 所有测试用户都共享同一个初始密码.
sh wolf-demo-init.sh init-password
```



脚本 `wolf-demo-init.sh` 执行成功后, 输出大概如下:

```
  rbac
    ✓ check exist (111ms)
    ✓ application (60ms)
    ✓ category
    ✓ permission (238ms)
    ✓ role (191ms)
---------- rbac users for application [openresty]-----------
or_index  init-password
or_en  init-password
or_cn  init-password
or_changes  init-password
or_changes_all  init-password
or_cn_getting_start  init-password
suffix_user  init-password
    ✓ user (688ms)
    ✓ resource (1334ms)


  7 passing (3s)


  rbac
    ✓ check exist
    ✓ application (70ms)
    ✓ category (74ms)
    ✓ permission (345ms)
    ✓ role (107ms)
---------- rbac users for application [restful-demo]-----------
app-man  init-password
user-role-perm-man  init-password
log  init-password
    ✓ user (366ms)
    ✓ resource (785ms)

```
**重要: 请务必保存上面的rbac用户信息, 后面的OpenResty测试应用及restful-demo的测试会用到他们.**



#### 访问管理后台(Console)

* 地址: http://127.0.0.1:10080
* 用户: root
* 密码: wolf-123456



#### 访问restful-demo应用(由wolf-agent代理,并添加了rbac)

* 地址: http://127.0.0.1:10084

**用户名及密码: 请使用上面保存的rbac用户信息来登陆,测试. 包含3个账号: app-man, user-role-perm-man, log **



#### 访问restful-demo应用(没有rbac, 可直接访问)

* 地址: http://127.0.0.1:10090

不需要登陆, 你可以直接访问.


#### 访问OpenResty应用(由wolf-agent代理,并添加了rbac)

* 地址: http://127.0.0.1:10082

**用户名及密码: 请使用上面保存的rbac用户信息来登陆,测试.**


#### 访问数据库

```bash
docker exec -ti wolf-database psql --port=5432 --host=127.0.0.1 -U root -d wolf
```
