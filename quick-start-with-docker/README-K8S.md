
## Using k8s deployment

[k8s 部署](./README-K8S-CN.md)

### 1. Create the postgres-deploy.yaml file
The content and description of the `postgres-deploy.yaml` file are as follows:
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
              # username to connect to the database
            - name: POSTGRES_USER
              value: root
              # password to connect to the database
            - name: POSTGRES_PASSWORD
              value: "R0FSCY2pcuAlWhmp"
              # if you specify a database name, the database is automatically created
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
          # The temporary directory is used here, and the data will be lost after the container is restarted
          # In order to persist data, it is recommended to mount PVC
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
#### Depolying Postgres in k8s

```shell
kubectl apply -f postgres-deploy.yaml
```
Using the following command to see if the pod is working properly
```shell
[root@node01 ~]# kubectl get pod -n default
NAME                                     READY   STATUS    RESTARTS   AGE
postgres-wolf-54d8dbfbf-9t629            1/1     Running   0          42m
```
#### Initialization data

Using the following command to copy [db.sql](../server/script/db.sql) into container, `db.sql` needs to be in the current directory

```shell
kubectl cp db.sql postgres-wolf-54d8dbfbf-9t629:/
```
Execute the `db.sql` script with the following command
```shell
kubectl exec postgres-wolf-54d8dbfbf-9t629 -- psql  -d wolf  -f /db.sql
```
> Note that `postgres-wolf-54d8dbfbf-9t629` is the name of the pod
> 
> If there is external postgres, you do not need to deploy the above postgres


### 2. Create the wolf-deploy.yaml file
The content and description of the `wolf-deploy.yaml` file are as follows:
```yaml
---
apiVersion: v1
kind: ConfigMap
metadata:
  namespace: default
  name: wolf-config
data:
  # The default password for root and admin accounts. The default is 123456
  RBAC_ROOT_PASSWORD: "wolf-123456"
  # To encrypt the KEY used by the user token, it is highly recommended to set this value
  RBAC_TOKEN_KEY: "f40215a5f25cbb6d36df07629aaf1172240fe48d"
  # To encrypt the application Secret and OAuth2 login user ID keys
  WOLF_CRYPT_KEY: "fbd4962351924792cb5e5b131435cd30b24e3570"
  # The database link to the postgres database
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
#### 2. Deploying wolf-server in k8s
```shell
kubectl apply -f wolf-deploy.yaml
```
Using the following command to see if the pod is working properly
```shell
[root@node01 ~]# kubectl get pod -n default
NAME                                     READY   STATUS    RESTARTS   AGE
postgres-wolf-54d8dbfbf-9t629            1/1     Running   0          42m
wolf-server-b8f588587-xv97t              1/1     Running   0          2m
```

After wolf-server is running normally, you can temporarily expose the service in the following ways:
```shell
kubectl port-forward service/wolf-server 12180:80
```
**It is recommended to expose services through ingress**

#### 3. Log in to the console with your account
Accessing previously exposed services: http://localhost:12180

![登录页面](../docs/imgs/screenshot/console/login.png)

You can see from the code in [init-root-user.js](../server/src/util/init-root-user.js)

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
Two users will be created automatically when the service is started for the first time: `root` and `admin`.
Password is the value of `RBAC_ROOT_PASSWORD`.


