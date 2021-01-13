# application

* unittest app-for-unit-test
* unittest2 app-for-unit-test2

# user

* unit-user for-agent-test
	* permission
		* PERM_INDEX
	* role
		* ROLE_INDEX
* u-none no-any-permission-user
* u-index match-type-equal-index
	* permission
		* PERM_INDEX
* u-user-get match-type-equal-user-get
	* permission
		* PERM_USER_GET
* u-user-all match-type-prefix-user-all
	* permission
		* PERM_USER_ALL
* u-js match-type-suffix-js
	* permission
		* PERM_JS_FILE
* u-role-test test-all-role
	* role
		* ROLE_INDEX
		* ROLE_READONLY
		* ROLE_SYSTEM_GET
		* ROLE_SYSTEM_POST
	* permission
		* PERM_SYSTEM_PUT


# category

* Group01
* Group02


# permission

* PERM_INDEX index-page
* PERM_USER_GET user-get
	* Group01
* PERM_USER_ALL user-all
	* Group01
* PERM_JS_FILE all-index-file
* PERM_SYSTEM_ALL all-system-page
	* Group02
* PERM_SYSTEM_GET system-get
	* Group02
* PERM_SYSTEM_POST system-post
	* Group02
* PERM_SYSTEM_PUT system-put
	* Group02

# role
* ROLE_INDEX index-role
	* PERM_INDEX
* ROLE_READONLY read-only
	* PERM_INDEX
	* PERM_USER_GET
	* PERM_JS_FILE
* ROLE_SYSTEM_GET system-get
	* PERM_SYSTEM_GET
* ROLE_SYSTEM_POST system-post
	* PERM_SYSTEM_POST

# resource

* equal
	* ALL / PERM_INDEX
	* GET /v1/user PERM_USER_GET
* prefix
	* ALL / DENY_ALL
	* GET /public ALLOW_ALL
	* GET /v1/user PERM_USER_ALL
	* ALL /v1/system PERM_SYSTEM_ALL
	* GET /v1/system PERM_SYSTEM_GET
	* POST /v1/system PERM_SYSTEM_POST
	* PUT /v1/system PERM_SYSTEM_PUT
* suffix
	* GET .js PERM_JS_FILE

# access

* u-none
	* GET /
		* 401
	* GET /test
		* 401
	* GET /public
		* 200
* u-index
	* GET /
		* 200
	* GET /user
		* 401
* u-user-get
	* GET /v1/user
		* 200
	* GET /v1/user/info
		* 401
	* PUT /v1/user
		* 401
* u-user-all
	* GET /v1/user
		* 401
	* GET /v1/user/info
		* 200
	* GET /v1/user2
		* 200
	* GET /v1/user/test.js
		* 401
* u-js
	* POST /static/js/test.js
		* 401
	* GET /static/js/test.js
		* 200
	* GET /static/js/img.jpg
		* 401
* u-role-test
	* GET /
		* 200
	* GET /test
		* 401
	* GET /v1/user
		* 200
	* PUT /v1/user
		* 401
	* GET /v1/user/info
		* 401
	* GET /v1/user/user.jpg
		* 401
	* GET /v1/user/test.js
		* 200
	* GET /public/test
		* 200
	* GET /v1/system
		* 200
	* POST /v1/system
		* 200
	* PUT /v1/system
		* 200
	* DELETE /v1/system
		* 401