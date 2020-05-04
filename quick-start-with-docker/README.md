## Quick Start with Docker

[快速起步](./README-CN.md)

#### Requirement

* docker
* docker-compose
* Optional: git or wget


#### Startup 

```bash
# If your environment does not have a git command, 
# you can manually download the repo on github.com
git clone https://github.com/iGeeky/wolf.git

cd wolf/quick-start-with-docker

# startup the wolf system by docker.
docker-compose up -d database
# Launch the docker container.
# It is strongly recommended that you modify the `RBAC_TOKEN_KEY` and `WOLF_CRYPT_KEY` environment variables in `docker-compose.yaml`, using default settings may put the system at risk.
docker-compose up -d server restful-demo agent-or agent-demo

# init demo configuration in wolf-server.
# The script reads two datasets of application from the configuration and initializes them into the wolf-server.
# There are two ways to initialize:
# 1: Without specifying a password, the system generates a random password for each test user. This is the recommended way.
sh wolf-demo-init.sh
# 2: Specify the initial password, all test users share the same initial password.
sh wolf-demo-init.sh init-password
```


 the output of script `wolf-demo-init.sh`, like this:

```

  rbac
    ✓ check exist (87ms)
    ✓ application (189ms)
    ✓ category
    ✓ permission (275ms)
    ✓ role (127ms)
---------- rbac users for application [openresty]-----------
or_index  VgbydZ2zH0Cr
or_en  gcP8QVHz4XXD
or_cn  BSgXR1SO0Ifp
or_changes  uJBGJ3TjMXRL
or_changes_all  i0djWlKm93Nj
or_cn_getting_start  eRH7YalKRrW2
suffix_user  Q1AJjkPV1ByF
    ✓ user (577ms)
    ✓ resource (382ms)

  rbac
    ✓ check exist
    ✓ application
    ✓ category (65ms)
    ✓ permission (238ms)
    ✓ role (43ms)
---------- rbac users for application [restful-demo]-----------
app-man  4xKn0KfwRvKn
user-role-perm-man  mzrrSelYxN2w
log  JIp2V5w8Mt8K
    ✓ user (217ms)
    ✓ resource (418ms)

```
**Important: Be sure to save the `rbac users` information in the above, which they will used later in the demo test**



#### Access The Console

*  URL: http://127.0.0.1:10080
* USER: root
*  PWD: wolf-123456



#### Access Application restful-demo(proxies by wolf-agent. With rbac)

*  URL: http://127.0.0.1:10084

**USER AND PASSWORD: Use the account and password you saved above**



#### Access Application restful-demo(Without rbac)

* URL: http://127.0.0.1:10090

No need to log in, you can directly access.

#### Access Application OpenResty(proxies by wolf-agent. With rbac)

* URL: http://127.0.0.1:10082

**USER AND PASSWORD: Use the account and password you saved above**



#### Access The database

```bash
docker exec -ti wolf-database psql --port=5432 --host=127.0.0.1 -U root -d wolf
```
