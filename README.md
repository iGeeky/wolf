[Chinese](README-CN.md)

## Introduction

Wolf is a universal Role-Based Access Control (RBAC) system, designed to provide unified authorization and access control for all HTTP applications. 

Every company usually has different backend services and management systems, each with their own account system and permission management module, leading to repeated development and resource waste. Additionally, the lack of a unified account number can cause administrative confusion, especially when systems are developed by different teams.

However, with Wolf, a variety of platforms and systems can benefit from a unified account number and authorization, without the need for additional development work.

## Community

- QQ Group: 85892505



## Features

- Language-independent: Wolf can be used with any HTTP program, including but not limited to: pure static web pages, JSP, PHP, ASP, Python, Node.js, and other web systems.
- Low coupling and non-intrusive: Wolf supports new applications without any modifications or changes to the application, and it manages resource rights at the proxy level.
- Management backend (`Console Module`) for managing `Applications`, `Users`, `Roles`, `Permissions`, and `Resources`.
- Supports `OAuth 2.0` authorization and can be easily used as an authentication source by other applications.
- Supports two types of user authentication: password authentication and `LDAP` authentication.
- Supports `RESTful` interfaces and also supports pure HTML applications for backend rendering.
- Supports access logging and querying for auditing.
- Rich test cases with over 90% code line coverage.
- Supports `PostgreSQL` and `MySQL` databases.
- APISIX gateway support [Apache APISIX: Wolf-RBAC](https://github.com/apache/incubator-apisix/blob/master/doc/plugins/wolf-rbac-cn.md)
- The system has three main modules:
  * Wolf-Server: implements service and management backend functionality.
  * Wolf-Console: implements the frontend code for the management backend.
  * Wolf-Agent: implements the RBAC access check agent.
- The system contains the following entity objects:
  * `Application`: supports multiple applications. Different applications can have different permissions, roles, and resources. You can view the RBAC object relationship diagram under the application.
  * `User`: shared by all applications. Objects that can be authorized for users include:
    * Administrator privileges: users set as administrators can log in to the "Console" to manage the backend and manage the application.
    * Application list: can assign zero to multiple applications to a user. The meaning of the application list varies depending on the type of user:
      * For administrative users, these applications can be managed.
      * For non-administrative users, these applications can be accessed and used.
    * Roles: multiple roles can be assigned to the user, and the permissions the user ends up with are a collection of permissions from all roles.
    * Permission: the system can assign permissions directly to users. Although this approach is not usually supported in standard RBAC models, Wolf supports it.
  * `Role`: can contain a set of permissions.
  * `Category`: is a way to classify (group) permissions for easy management, usually by large functional modules. In the system's Permissions selection box, permissions will be grouped by category.
  * `Permission`: is a one-to-many relationship with resources, where one resource can have one permission or multiple resources can use the same permission.
  * `Resource`: Currently, it mainly handles HTTP requests. The unique resource is determined by the `Match Type`, `Name`, and `Action` properties. The four most important groups of a resource are:
    * `Match Type`: URL match type, supports three types: `equals match`, `suffix match`, and `prefix match`.
    * `Name`: Refers to the requested HTTP URL. If it's an `equals match` or `prefix match`, it usually starts with `/`. If it's a `suffix match`, it's usually a common resource suffix, such as `.jpg`, `.js`, *no wildcards or regulars are supported*.
    * `Action`: Refers to the requested `HTTP Method`. The method `ALL` matches all methods.
    * `Permission`: Specifies the permissions required to access the resource. There are two built-in permissions: `Allow All` means that all users have access, and `Deny All` means that all users cannot access.
  * `Audit Log`: An audit log that records all accesses to the system (including `Wolf-Console` and applications managed by the system). The following key information is recorded:
    * User ID, User Name, User Nickname
    * Access date, time, and IP of the visitor
    * HTTP method and URL
    * Match on resources
    * The status code of the access response
    * Request args parameter or request body (only `Wolf-Console` records are supported).
* The resource matching method supports different priorities, with the following priority rules:
  * `Match Type` priority from high to low: `equals match`, `suffix match`, `prefix match`.
  * `Action` means `HTTP Method`. `ALL` has lower priority. Other methods (such as `GET`, `POST`, `PUT`) have the same priority, but all have higher priority than `ALL`.
  * `Name` means `HTTP URL`. The priority is related to the URL length. The longer the URL, the higher the priority.


**Note: The URL in this article refers only to the path section of the URL standard, not the domain name, port, and parameters section.**

## Architecture

![Architecture](./docs/imgs/architecture.png)



## Relations

![Relations](./docs/imgs/data-model.png)


## Technologies

- Server: NodeJS, KOA, Sequelize, JWT
- Console: VueJS, Element, Babel, NodeJS
- Agent: OpenResty (ngx_lua)
- Database: PostgreSQL
- Cache: Redis



## Getting Started

[Getting Started](./quick-start-with-docker/README.md)



## Preview

#### Console

| ![Application List](./docs/imgs/screenshot/console/application.png) |
|:--:|
| *Application List* |

| ![Application List](./docs/imgs/screenshot/console/application-diagram.png) |
|:--:|
| *Application, User, Role, Permission Relations* |

| ![user management](./docs/imgs/screenshot/console/user.png) |
|:--:|
| *User Management* |

| ![role management](./docs/imgs/screenshot/console/role.png) |
|:--:|
| *Role Management* |

| ![Details of the role's permissions](./docs/imgs/screenshot/console/permission-detail.png) |
|:--:|
| *Details of the Role's Permissions/Permissions Grouping Display* |

| ![permission management](./docs/imgs/screenshot/console/permission.png) |
|:--:|
| *Permission Management* |

| ![Audit log](./docs/imgs/screenshot/console/audit-log.png) |
|:--:|
| *Audit Log* |



#### Client/Demo

| ![Client Login](./docs/imgs/screenshot/client/login.png) |
|:--:|
| *Client Login* |

| ![Main Page](./docs/imgs/screenshot/client/main.png) |
|:--:|
| *Main Page (Note: Added information bar at top.)* |

| ![No Permission Page](./docs/imgs/screenshot/client/no-permission.png) |
|:--:|
| *No Permission Page* |



## Deployment

[Deployment Document](./docs/deploy.md)

[LDAP Configuration](./docs/ldap-config.md)

[API Documentation](./docs/admin-api.md)

[OAuth2 Interface Documentation](./docs/admin-api-oauth2.0.md)


## Tests

[Server API Unit Testing](./docs/unittest.md)

## Performance

[`Agent` API Performance Testing](./docs/perf.md)


## Manual Document

[Usage](./docs/usage.md)


## Change Log

[Change Log](./ChangeLog.md)


## License

[MIT](./LICENSE)

