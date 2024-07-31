[Chinese](README-CN.md)
[Japanese](README-JA.md)

## Introduction

Wolf is a versatile Role-Based Access Control (RBAC) authority system, suitable for all HTTP applications, offering unified authorization and access control functionalities.

It addresses the common issue within companies where various backend services and their corresponding management interfaces have disparate account systems and authority modules. This redundancy leads to resource wastage and management disarray, particularly when different teams develop these systems. Wolf enables a consolidated account and authorization management across diverse platforms and systems without necessitating any modifications to existing systems.


## Community

- QQ Group: 85892505



## Features

- **Language Independent**: Compatible with any HTTP-enabled application, including static web pages, JSP, PHP, ASP, Python, Node.js, and other web systems.
- **Low Coupling & Non-intrusive**: Facilitates the integration of new applications without requiring modifications, managing resource permissions at a proxy layer.
- **Integrated Management Console** (`console` module): Manages applications, users, roles, permissions, and resources.
- **OAuth 2.0 Support**: Enables login with Wolf account for seamless application integration.
- **Dual Authentication Modes**: Supports password and LDAP authentication.
- **Comprehensive Application Support**: Accommodates Restful interfaces and purely HTML applications rendered on the backend.
- **Access Logging**: Facilitates auditing and troubleshooting through detailed access logs.
- **Extensive Testing**: Code coverage exceeding 90%.
- **Database Compatibility**: Works with PostgreSQL and MySQL.
- **APISIX Gateway Support**: Integrates with [Apache APISIX: Wolf-RBAC](https://github.com/apache/apisix/blob/master/docs/en/latest/plugins/wolf-rbac.md)
- The system encompasses three primary modules:
  * `Wolf-Server`: Implements service and backend functionalities.
  * `Wolf-Console`: Frontend code for management.
  * `Wolf-Agent`: Access Check proxy for RBAC.
- Entity Objects in the System:
  * **Applications**: Supports multiple applications with distinct permissions, roles, and resources, and enables visualization of RBAC object relationship charts.
  * **Users**: A unified user base across the entire system. User-specific authorizations include:
    * **Administrator Permissions**: Administrators can log into the **Console** for backend management and oversee applications.
    * **Application List**: Users can be associated with a variety of applications. For administrators, this means management capabilities; for non-administrators, this implies login and usage rights.
    * **Roles**: Users can be assigned multiple roles, accumulating a comprehensive set of permissions from each role.
    * **Permissions**: Direct permission assignments are possible, deviating from typical RBAC models to enhance flexibility.
  * **Roles**: Encompasses a collection of permissions, structuring user access and capabilities.
  * **Permission Categories**: Organizes permissions into manageable groups, typically aligned with major functional modules for easier navigation and assignment.
  * **Permission**: Establishes a one-to-many relationship with resources, allowing singular or shared permissions across multiple resources.
  * **Resources**: Primarily associated with HTTP requests, characterized by a unique combination of **match type**, **name**, and **action**. Key attributes include:
    * **Match Type**: Defines how URLs are matched, including exact, suffix, and prefix matching methods.
    * **Name**: The specific HTTP URL, with conventions based on the match type.
    * **Action**: The HTTP method applicable, with **ALL** encompassing all methods.
    * **Permission**: Refers to the permissions required to access a resource. The system has two built-in permissions: **Allow All** means all users can access, **Deny All** means no user can access.
  * **Audit Log**: A comprehensive record of all system interactions, including user details, access metrics, and resource matches, supporting robust auditing and issue tracing.
* The resource matching method accommodates various priorities, governed by the following set of rules:
  * **Match Type Priority**: The order of priority for match types is as follows:
    * **Equals Match**: This type holds the highest priority.
    * **Suffix Match**: Ranked next in priority, focusing on URL suffixes.
    * **Prefix Match**: The lowest in priority, emphasizing URL prefixes.
  * **Action** (Representing HTTP Method):
    * The term 'Action' corresponds to the HTTP Method used.
    * **ALL**: This method is given the lowest priority among the HTTP methods.
    * **Specific Methods** (e.g., GET, POST, PUT): These methods share an equal level of priority, each ranking higher than the 'ALL' method.
  * **Name** (Indicating HTTP URL):
    * 'Name' refers to the HTTP URL.
    * The priority is based on URL length; a longer URL signifies a higher priority.



**Note: The URL references herein are confined to the path component of the standard URL structure, excluding domain, port, and parameter details**

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

