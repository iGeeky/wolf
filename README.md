[中文](README-CN.md)
[日本語（にほんご）](README-JA.md)

## Introduction

Wolf is a versatile Role-Based Access Control (RBAC) authority system, suitable for all HTTP applications, offering unified authorization and access control functionalities.

It addresses the common issue within companies where various backend services and their corresponding management interfaces have disparate account systems and authority modules. This redundancy leads to resource wastage and management disarray, particularly when different teams develop these systems. Wolf enables a consolidated account and authorization management across diverse platforms and systems without necessitating any modifications to existing systems.

## Features

The Wolf system has the following main features:

### 1. Universality and Flexibility

* Language Independent: Applicable to any HTTP application, including pure static web pages, JSP, PHP, ASP, Python, Node.js, and other web systems
* Low Coupling & Non-intrusive: New applications can be integrated without modifications, managing resource permissions at the proxy layer
* Supports both Restful interfaces and purely HTML applications rendered on the backend

### 2. Diverse Authentication and Authorization

* Authentication Sources:
  - Password Authentication: Using internally stored usernames and passwords
  - LDAP Authentication: User authentication through external LDAP servers
* Authentication Protocols:
  - JWT (JSON Web Token): For generating and verifying access tokens
  - HTTP Basic Auth: Supports basic authentication with username and password
* Authorization Protocol:
  - OAuth 2.0: Supports login and authorization using Wolf accounts for other applications

### 3. Comprehensive Management Functions

* Built-in management console (console module): Manages applications, users, roles, permissions, and resources
* Supports access log recording and querying, facilitating auditing and issue tracing
* Supports viewing RBAC object relationship charts for applications

### 4. High Performance and Scalability

* Supports advanced radixtree routing for high-performance, complex URL matching
* Compatible with PostgreSQL and MySQL databases
* Supports integration with [APISIX gateway](https://github.com/apache/apisix/blob/master/docs/en/latest/plugins/wolf-rbac.md)

### 5. System Architecture

* Three main modules:
  - Wolf-Server: Service implementation and backend management functionality
  - Wolf-Console: Frontend code for the management console
  - Wolf-Agent: RBAC Access Check proxy

### 6. Core Entity Objects

* Applications: Supports multiple applications, each with distinct permissions, roles, and resources. Allows viewing of RBAC object relationship charts for each application.

* Users: Shared across the entire system. User-specific authorizations include:
  - Administrator Permissions: Users set as administrators can log into the `Console` backend for application management.
  - Application List: Users can be assigned zero to multiple applications. The meaning varies based on user type:
    * For admin users, it indicates which applications they can manage.
    * For non-admin users, it indicates which applications they can log into and use.
  - Roles: Users can be assigned multiple roles, accumulating permissions from all roles.
  - Permissions: Direct permission assignments are possible, deviating from typical RBAC models.

* Roles: Can include a set of permissions.

* Permission Categories: A way to categorize (group) permissions for easier management, typically aligned with major functional modules. In the system's permission selection box, permissions are displayed grouped by category.

* Permissions: Have a one-to-many relationship with resources. A resource can be assigned one permission, or multiple resources can share the same permission.

* Resources: Primarily refers to HTTP requests. A resource is uniquely identified by `Match Type` + `Name` + `Action`. Key attributes include:
  - Match Type:
    * Without `radixtree` routing: URL matching methods include `Exact Match`, `Suffix Match`, and `Prefix Match`.
    * With `radixtree` routing: Supports `radixtree` mode, implementing `Exact Match`, `Suffix Match`, and `Prefix Match` through name syntax.
  - Name: Refers to the HTTP URL.
    * Without `radixtree` routing: For `Exact Match` and `Prefix Match`, usually starts with `/`. For `Suffix Match`, typically a common resource suffix like `.jpg`, `.js`. *Wildcards or regex not supported*.
    * With `radixtree` routing: Default is exact match. Use `*` for prefix match: `/foo*` matches `/foobar` but not `/foo/bar`. Use `**` for any match: `/foo**` matches `/foo/bar` and `/foo/car/far`. Use `**` for suffix match: `**.jpg` matches `/images/photo.jpg` and `/uploads/profile.jpg`.
  - Action: Refers to the HTTP method. `ALL` matches all methods.
  - Permission: Indicates the permission required to access the resource. Two built-in permissions: `Allow All` means all users can access, `Deny All` means no user can access.

* Audit Log: Records all access through the system (including `Wolf-Console` and applications managed by the system). Main information recorded:
  - User ID, username, user nickname;
  - Access date, time, and IP of the accessor;
  - HTTP method and URL;
  - Matched resource;
  - Access response status code;
  - Request parameters or request body (only supported for `Wolf-Console` records).

### 7. Other Features

* Extensive test cases with over 90% code coverage
* Resource matching supports different priority rules:
  - Priority of `Match Type` from high to low: Exact Match, Suffix Match, Prefix Match.
  - Action (HTTP method) priority: ALL has lower priority, other methods (like GET, POST, PUT) have equal priority but higher than ALL.
  - Name (HTTP URL) priority relates to URL length; longer URLs have higher priority.

**Note: URLs in this system refer only to the path part of the standard URL, excluding domain name, port, and parameter parts**

## Architecture

![Architecture](./docs/imgs/architecture.png)



## Relations

![Relations](./docs/imgs/data-model.png)


## Technologies

- **Server**: Utilizes NodeJS, KOA, Sequelize, JWT
- **Console**: Employs VueJS, Element, Babel, NodeJS
- **Agent**: Powered by OpenResty(ngx_lua)
- **Database**: Supports PostgreSQL.
- **Cache**: Incorporates Redis.



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
