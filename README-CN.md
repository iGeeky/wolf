[English](README.md)

## Introductions

wolf是一个通用RBAC系统，适用于所有的HTTP应用．统一授权及访问控制.


每个公司内部会有各种不同的后台服务及相应的管理后台．通常不同的系统会有一套自己的账号系统及权限管理模块。重复的开发使得开发资源浪费．并且不统一的账号，造成管理上的混乱。如果系统是由不同的团队来开发，这种情况将更糟糕．

本系统可以应用于各种平台，及各种系统之上． 统一账号及统一授权．并且各系统无需任何开发工作．


## Features



* 语言无关，任何HTTP程序都能使用，包括但不限于：纯静态网页，JSP，PHP，ASP，PYTHON，NODE JS等WEB系统
* 低耦合, 无侵入性, 支持新的应用不需要对应用进行任何修改与改造, 系统在代理层对资源权限进行管理
* 自带管理后台(`console模块`)，可对`应用`，`用户`，`角色`, `权限`及`资源`进行管理
* 支持 `OAuth 2.0` 授权, 方便其它应用使用 `wolf` 账号登陆
* 支持`Restful`接口, 也支持后端渲染的`纯html`应用
* 支持访问日志记录与查询, 以进行审计及问题追溯.
* 支持APISIX网关[apache-apisix:wolf-rbac](https://github.com/apache/incubator-apisix/blob/master/doc/plugins/wolf-rbac-cn.md)
* 系统有三大模块:
  * Wolf-Server 服务实现,管理后台功能实现
  * Wolf-Console 管理后台前端代码实现
  * Wolf-Agent RBAC的Access Check代理
* 系统包含以下实体对象:
  * `Application`, 应用, 支持多应用. 不同的应用可以拥有不同的权限,角色及资源. 可以查看应用下的RBAC对象关系图表.
  * `User`, 用户, 整体系统共享用户. 可以给用户授权的对象包括:
    * 管理员权限, 设置为管理员的用户可以登陆`Console`管理后台,并对应用进行管理
    * 应用列表, 可以为用户分配零到多个应用. 根据用户类型不同, 应用列表的意义也不同: 
      * 对于管理员用户, 表示可以对这些应用进行管理.
      * 对于非管理员用户, 表示可以对这些应用进行登陆及使用
    * 角色, 可以为用户分配多个角色, 用户最终拥有的权限是所有角色的权限的合集
    * 权限, 可以直接为用户分配权限. 虽然标准的RBAC模型中通常不支持这种方式, 但是本系统支持
  * `Role`, 角色, 角色可以包含一组权限.
  * `Category`, 权限分类, 一种对权限进行分类(分组)的方式, 方便管理, 通常可以按大的功能模块进行分类. 在系统中`权限选择框`中会按分类对权限进行分组显示.
  * `Permission`, 权限, 权限与资源是一对多的关系, 可以一个资源一个权限, 也可以多个资源使用同一个权限.
  * `Resource`, 资源, 目前主要是HTTP请求. 资源的属性`Match Type` + `Name` + `Action` 确定一条唯一的资源. 一个资源最重要的4元组是:
    * `Match Type`, URL匹配类型, 支持`精确匹配`，`后缀匹配`，`前缀匹配`三种模式
    * `Name`, 指请求的HTTP URL. 如果是`精确匹配`和`前缀匹配`, 通常是以`/`开头. 如果是`后缀匹配`, 通常是资源共有的后缀, 如: `.jpg`, `.js`,  *不支持通配符或正则*.
    * `Action`, 指请求的`HTTP Method`.  方法`ALL`能匹配所有方法.
    * `Permission`, 指定访问该资源需要的权限. 两个内置权限: `Allow All`表示所有用户可访问, `Deny All`表示所有用户不可访问.
  * `Audit Log`, 审计日志, 记录了所有经过本系统的访问情况(包含`Wolf-Console`及本系统管理的应用). 记录了以下主要信息:
    * 用户ID, 用户名, 用户昵称
    * 访问日期, 时间及访问者的IP
    * HTTP方法,及URL,
    * 匹配上的资源.
    * 访问响应的状态码.
    * 请求args参数或request body(只支持了`Wolf-Console`的记录).
* 资源匹配方式, 支持不同的优先级, 优先级规则如下:
  * `Match Type`优先级从高到低, 依次是: 精确匹配, 后缀匹配, 前缀匹配.
  * `Action` 即`HTTP Method`.  `ALL`优先级比较低, 其它方法(如`GET`, `POST`, `PUT`)优先级相同, 但都比`ALL`高.
  * `Name` 即`HTTP URL`.  优先级与URL长度有关, URL越长优先级越高.

**注意: 本文中的URL仅指URL标准中的path部分, 不包含域名,端口及参数部分**

## Architecture

![Architecture](./docs/imgs/architecture.png)



## Relations

![Relations](./docs/imgs/data-model.png)


## Technologies

* Server: NodeJS, KOA, Sequelize, JWT
* Console: VueJS, Element, Babel, NodeJS
* Agent: OpenResty(ngx_lua)
* Database: PostgreSQL.





## Getting Started

[快速起步](./quick-start-with-docker/README-CN.md)



##  Preview

#### Console

| ![应用列表](./docs/imgs/screenshot/console/application.png) |
|:--:|
| *应用列表* |

| ![应用列表](./docs/imgs/screenshot/console/application-diagram.png) |
|:--:|
| *应用,用户,角色,权限关系图* |


| ![用户管理](./docs/imgs/screenshot/console/user.png) |
|:--:|
| *用户管理* |

| ![角色管理](./docs/imgs/screenshot/console/role.png) |
|:--:|
| *角色管理* |

| ![角色的权限详情](./docs/imgs/screenshot/console/permission-detail.png) |
|:--:|
| *角色的权限详情/权限分组显示* |

| ![权限管理](./docs/imgs/screenshot/console/permission.png) |
|:--:|
| *权限管理* |

| ![审核日志](./docs/imgs/screenshot/console/audit-log.png) |
|:--:|
| *审核日志* |



#### Client/Demo

| ![客户端登陆](./docs/imgs/screenshot/client/login.png) |
|:--:|
| *客户端登陆* |

| ![主页面](./docs/imgs/screenshot/client/main.png) |
|:--:|
| *主页面(注意: 顶部添加了信息栏)* |

| ![无权限页](./docs/imgs/screenshot/client/no-permission.png) |
|:--:|
| *无权限页* |



## Deployment

[部署文档](./docs/deploy-cn.md)

[API文档](./docs/admin-api-cn.md)

[OAuth2接口文档](./docs/admin-api-oauth2.0-cn.md)


## Manual Document

[使用指南](./docs/usage.md)


## Change Log

[Change Log](./ChangeLog.md)

## License

[MIT](./LICENSE)

