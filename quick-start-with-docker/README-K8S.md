
## Using k8s deployment

[k8s 部署](./README-K8S-CN.md)

### 1. Create the namespace

```shell
cd wolf/quick-start-with-docker

# create the namespace
kubectl create namespace wolf
# check that the namespace exists
kubectl get ns |grep wolf
## the output
wolf              Active   68s
````

### 2. Deploying Postgres


```shell
## Create the database
kubectl apply -f k8s/wolf-database.yaml

## Check if the status of the newly started pod is okay
kubectl get pods -n wolf

## The output
NAME                             READY   STATUS    RESTARTS   AGE
wolf-database-5549df4cc8-gkfrv   1/1     Running   0          22s
```

#### Initialization data

Using the following command to copy [db-psql.sql](../server/script/db-psql.sql) into container.

```shell
export DB_POD_NAME=`kubectl get pods -n wolf |grep wolf-database | awk '{print $1}'`

# copy db-psql.sql
kubectl cp -n wolf ../server/script/db-psql.sql ${DB_POD_NAME}:/

# Execute the `db-psql.sql` script with the following command
kubectl exec ${DB_POD_NAME} -n wolf -- psql -h 127.0.0.1 -d wolf -U wolfroot -f /db-psql.sql
```

### 3. Deploying Redis


```shell
## Create the redis
kubectl apply -f k8s/wolf-cache.yaml

## Check if the status of the newly started pod is okay
kubectl get pods -n wolf |grep wolf-cache

## The output:
wolf-cache-6bc766fbdd-5llxc      1/1     Running     2          21m
```

### 4. Deploying wolf-server

```shell
## Create the wolf-server
kubectl apply -f k8s/wolf-server.yaml

## Check if the status of the newly started pod is okay
kubectl get pods -n wolf |grep wolf-server

## The output:
wolf-server-6854bcfb96-cz7rj     1/1     Running   0          8m16s
```

After wolf-server is running normally, you can temporarily expose the service in the following ways:
```shell
kubectl port-forward service/wolf-server -n wolf 12180:80
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


