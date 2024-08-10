
# 运行agent代理restful-demo

```bash
docker run -ti --rm --name wolf-agent-demo -p 10094:10094 \
-e BACKEND_URL=http://docker.for.mac.localhost:10090 \
-e RBAC_SERVER_URL=http://docker.for.mac.localhost:12180 \
-e RBAC_APP_ID=restful-demo \
-e AGENT_PORT=10094 \
-e EXTENSION_CONFIG="include /opt/wolf/agent/conf/no-permission-demo.conf;" \
igeeky/wolf-agent

```

# 运行agent代理openresty.org网站

```bash
docker run -ti --rm --name wolf-agent-or -p 10096:10096 \
-e BACKEND_URL=http://openresty.org \
-e RBAC_SERVER_URL=http://docker.for.mac.localhost:12180 \
-e RBAC_APP_ID=openresty \
-e AGENT_PORT=10096 \
igeeky/wolf-agent

```

# 运行agent使用本地配置进行开发测试

```bash
cd path/to/wolf/agent
docker run -ti --rm --name wolf-agent-or-dev -p 10096:10096 \
-e BACKEND_URL=http://openresty.org \
-e RBAC_SERVER_URL=http://docker.for.mac.localhost:12180 \
-e RBAC_APP_ID=openresty \
-e AGENT_PORT=10096 \
-e EXTENSION_CONFIG="include /opt/wolf/agent/conf/no-permission-demo.conf;" \
-e ACCESS_CHECK_LUA="basic_auth_access_check.lua" \
-v ./:/opt/wolf/agent \
igeeky/wolf-agent
```