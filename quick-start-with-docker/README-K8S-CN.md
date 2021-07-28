
## 使用 k8s 部署
### 1. 创建 postgres-deploy.yaml 文件
`postgres-deploy.yaml` 文件内容及说明如下：
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  namespace: default
  name: postgres-wolf
  labels:
    app: postgres-wolf
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres-wolf
  template:
    metadata:
      labels:
        app: postgres-wolf
    spec:
      containers:
        - name: postgres-wolf
          image: postgres:11.4
          imagePullPolicy: Always
          ports:
            - containerPort: 5432
              name: http
              protocol: TCP
          env:
            - name: TZ
              value: Asia/Shanghai
              # 连接数据库的用户名
            - name: POSTGRES_USER
              value: root
              # 连接数据库的密码
            - name: POSTGRES_PASSWORD
              value: "R0FSCY2pcuAlWhmp"
              # 指定数据库名称，会自动创建数据库
            - name: POSTGRES_DB
              value: wolf
          resources:
            requests:
              cpu: 500m
              memory: 500Mi
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data
      volumes:
        - name: data
          # 这里使用的是临时目录，容器重启后数据会丢失
          # 为了持久化数据建议挂载 pvc
          emptyDir: {}

---
apiVersion: v1
kind: Service
metadata:
  namespace: default
  name: postgres-wolf
  labels:
    app: postgres-wolf
spec:
  ports:
    - name: port
      port: 5432
      protocol: TCP
      targetPort: 5432
  selector:
    app: postgres-wolf
  type: ClusterIP


```
#### 在 k8s 中部署 postgres

```shell
kubectl apply -f postgres-deploy.yaml
```
使用下面的命令查看 pod 是否正常运行
```shell
[root@node01 ~]# kubectl get pod -n default
NAME                                     READY   STATUS    RESTARTS   AGE
postgres-wolf-54d8dbfbf-9t629            1/1     Running   0          42m
```
#### 初始化数据
使用下面的命令将 [db.sql](../server/script/db.sql) 复制到容器中，`db.sql` 需要在当前目录
```shell
kubectl cp db.sql postgres-wolf-54d8dbfbf-9t629:/
```
使用下面的命令执行 db.sql 脚本
```shell
kubectl exec postgres-wolf-54d8dbfbf-9t629 -- psql  -d wolf  -f /db.sql
```
> 注意 `postgres-wolf-54d8dbfbf-9t629` 是 pod 的名字
> 
> 如果有外部的 postgres 则不需要部署上面的 postgres


### 2. 创建 wolf-deploy.yaml 文件
`wolf-deploy.yaml` 文件内容及说明如下：
```yaml
---
apiVersion: v1
kind: ConfigMap
metadata:
  namespace: default
  name: wolf-config
data:
  # root账号及admin账号的默认密码. 默认为123456
  RBAC_ROOT_PASSWORD: "wolf-123456"
  # 加密用户token使用的KEY, 强烈建议设置该值
  RBAC_TOKEN_KEY: "f40215a5f25cbb6d36df07629aaf1172240fe48d"
  # 加密应用Secret及OAuth2登陆用户ID使用的Key
  WOLF_CRYPT_KEY: "fbd4962351924792cb5e5b131435cd30b24e3570"
  # 连接 postgres 的地址
  RBAC_SQL_URL: "postgres://root:R0FSCY2pcuAlWhmp@postgres-wolf:5432/wolf"
  CLIENT_CHANGE_PWD: "no"

---
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app: wolf-server
  name: wolf-server
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: wolf-server
  template:
    metadata:
      labels:
        app: wolf-server
    spec:
      containers:
        - name: wolf-server
          image: igeeky/wolf-server
          imagePullPolicy: Always
          ports:
            - containerPort: 12180
              name: http
              protocol: TCP
          env:
            - name: TZ
              value: Asia/Shanghai
            - name: RBAC_ROOT_PASSWORD
              valueFrom:
                configMapKeyRef:
                  name: wolf-config
                  key: RBAC_ROOT_PASSWORD
            - name: RBAC_TOKEN_KEY
              valueFrom:
                configMapKeyRef:
                  name: wolf-config
                  key: RBAC_TOKEN_KEY
            - name: WOLF_CRYPT_KEY
              valueFrom:
                configMapKeyRef:
                  name: wolf-config
                  key: WOLF_CRYPT_KEY
            - name: RBAC_SQL_URL
              valueFrom:
                configMapKeyRef:
                  name: wolf-config
                  key: RBAC_SQL_URL
            - name: CLIENT_CHANGE_PWD
              valueFrom:
                configMapKeyRef:
                  name: wolf-config
                  key: CLIENT_CHANGE_PWD
          resources:
            requests:
              cpu: 200m
              memory: 500Mi


---
apiVersion: v1
kind: Service
metadata:
  name: wolf-server
  namespace: default
  labels:
    app: wolf-server
spec:
  ports:
    - name: port
      port: 80
      protocol: TCP
      targetPort: 12180
  selector:
    app: wolf-server
  type: ClusterIP


```
#### 2. 在 k8s 集群中部署 wolf-server
```shell
kubectl apply -f wolf-deploy.yaml
```
使用下面的命令查看 pod 是否正常运行
```shell
[root@node01 ~]# kubectl get pod -n default
NAME                                     READY   STATUS    RESTARTS   AGE
postgres-wolf-54d8dbfbf-9t629            1/1     Running   0          42m
wolf-server-b8f588587-xv97t              1/1     Running   0          2m
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

