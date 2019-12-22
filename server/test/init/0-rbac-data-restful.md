# application

* restful-demo demo-of-restful-app

# user

* app-man application-manager
	* permission
		* RESTFUL_INDEX
	* role
		* application
* user-role-perm-man user-role-permission-manager
	* permission
		* PERMISSION_READ
		* PERMISSION_WRITE
	* role
		* user-role
* log log-manager
	* permission
		* LOG_ALL


# category

* application-all
* user-role

# permission

* RESTFUL_INDEX index
* APPLICATION_READ application-read-all
	* application-all
* APPLICATION_WRITE application-create-update-delete
	* application-all
* USER_READ user-read-all
	* user-role
* USER_CREATE user-create
	* user-role
* USER_UPDATE user-update
	* user-role
* USER_DELETE user-delete
	* user-role
* ROLE_LIST role-list
	* user-role
* ROLE_WRITE role-create-update-delete
	* user-role
* PERMISSION_READ permission-read-all
* PERMISSION_WRITE permission-create-update-delete
* RESOURCE_READ resource-read-all
* RESOURCE_WRITE resource-create-update-delete
* LOG_ALL log-read-all


# role

* application APPLICATION-ALL
	* APPLICATION_READ
	* APPLICATION_WRITE
* user-role USER-ROLE-ALL
	* USER_READ
	* USER_CREATE
	* USER_UPDATE
	* USER_DELETE
	* ROLE_LIST
	* ROLE_WRITE

# resource

* equal
	* GET / RESTFUL_INDEX
	* GET /api/application APPLICATION_READ
	* GET /api/application/list APPLICATION_READ
	* GET /api/user/list USER_READ
	* POST /api/user USER_CREATE
	* PUT /api/user USER_UPDATE
	* DELETE /api/user USER_DELETE
	* GET /api/permission/list PERMISSION_READ
	* POST /api/permission PERMISSION_WRITE
	* PUT /api/permission PERMISSION_WRITE
	* DELETE /api/permission PERMISSION_WRITE
	* GET /api/resource/list RESOURCE_READ
	* POST /api/resource RESOURCE_WRITE
	* PUT /api/resource RESOURCE_WRITE
	* DELETE /api/resource RESOURCE_WRITE
	* GET /favicon.ico ALLOW_ALL
* prefix
	* ALL / DENY_ALL
	* ALL /api/application APPLICATION_WRITE
	* GET /api/role/list ROLE_LIST
	* ALL /api/role ROLE_WRITE
	* ALL /api/log LOG_ALL
* suffix
	* GET .css ALLOW_ALL
	* GET .jpg ALLOW_ALL
	* GET .woff ALLOW_ALL
	* GET .ttf ALLOW_ALL
	* GET .js ALLOW_ALL
