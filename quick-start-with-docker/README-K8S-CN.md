
## 使用 k8s 部署

[Deploying in k8s](./README-K8S.md)


### 1. 创建 namespace

```shell
cd wolf/quick-start-with-docker

# 创建命名空间
kubectl create namespace wolf
# 检查创建的命名空间
kubectl get ns |grep wolf
## 输出
wolf              Active   68s
````

### 2. 部署 Postgres


```shell
## 创建数据库
kubectl apply -f k8s/wolf-database.yaml

## 检查创建的pod状态
kubectl get pods -n wolf

## 输出
NAME                             READY   STATUS    RESTARTS   AGE
wolf-database-5549df4cc8-gkfrv   1/1     Running   0          22s
```

#### 初始化数据
使用下面的命令将 [db-psql.sql](../server/script/db.sql) 复制到容器中，`db.sql` 需要在当前目录
```shell
export DB_POD_NAME=`kubectl get pods -n wolf |grep wolf-database | awk '{print $1}'`

# copy db-psql.sql
kubectl cp -n wolf ../server/script/db-psql.sql ${DB_POD_NAME}:/

# 使用下面命令执行 `db-psql.sql`
kubectl exec ${DB_POD_NAME} -n wolf -- psql -h 127.0.0.1 -d wolf -U wolfroot -f /db-psql.sql
```


### 3. 部署 Redis


```shell
## 创建 Redis
kubectl apply -f k8s/wolf-cache.yaml

## 检查创建的pod状态
kubectl get pods -n wolf |grep wolf-cache

## 输出
wolf-cache-6bc766fbdd-5llxc      1/1     Running     2          21m
```

### 4. 部署 wolf-server

```shell
## 创建 wolf-server
kubectl apply -f k8s/wolf-server.yaml

## 检查创建的pod状态
kubectl get pods -n wolf |grep wolf-server

## 输出
wolf-server-6854bcfb96-cz7rj     1/1     Running   0          8m16s
```


wolf-server 正常运行后可以通过如下方式临时暴露服务
```shell
kubectl port-forward service/wolf-server 12180:80
```
**建议通过 ingress 的方式暴露服务**

#### 3. 使用账号登录控制台
访问前面暴露的服务：http://localhost:12180

![登录页面](../docs/imgs/screenshot/console/login.png)

从 [init-root-user.js](../server/src/util/init-root-user.js) 中的代码中可以看出：
```js
async function addRootUser() {
  await createUser('root', 'root(super man)', 'super')
  await createUser('admin', 'administrator', 'admin')
}
setTimeout(()=> {
    addRootUser().then(() => {

    }).catch((err) => {
        console.log('create root user failed! err: %s', err)
    })
}, 1000 * 1);
```
服务第一次启动的时候会自动创建两个用户：`root` 和 `admin`，密码为前面 `RBAC_ROOT_PASSWORD` 设置的密码。

