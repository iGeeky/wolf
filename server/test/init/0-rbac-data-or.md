# application

* openresty openresty.org

# user

* or_index openresty-index
	* permission
		* INDEX
		* INDEX_CN
		* INDEX_EN
* or_en openresty-english
	* permission
		* INDEX
	* role
		* en
* or_cn openresty-chinese
	* permission
		* INDEX
	* role
		* cn
* or_changes openresty-changes-without-1.0.xx
	* permission
		* 
	* role
		* index
		* changes
* or_changes_all openresty-changes
	* permission
		* 
	* role
		* index
		* changes
		* changes_all
* or_cn_getting_start cn-getting-start
	* permission
		* INDEX
		* INDEX_CN
	* role
* or_suffix_match components-resources
	* permission
		* COMPONENTS
		* RESOURCES
	* role
		* index
# category

* Group01
* Group02


# permission

* INDEX index
* INDEX_CN index-chinese
* INDEX_EN index-english
* CN_ALL all-chinese
	* Group01
* EN_ALL all-english
	* Group01
* CHANGES CHANGES(CN,EN),without-1.0.x
	* Group02
* CHANGES_10000 CHANGES,1.0.x
	* Group02
* CN_GETTING_START GETTING_START
	* Group02
* COMPONENTS components
	* Group02
* RESOURCES resources
* DOWNLOAD download(gz,zip,pdf)

# role
* index ALL-INDEX-PAGES
	* INDEX
	* INDEX_CN
	* INDEX_EN
* en ALL-ENGLISH-PAGES
	* INDEX_EN
	* EN_ALL
* cn ALL-CHINESE-PAGES
	* INDEX_CN
	* INDEX_EN
	* CN_ALL
* changes CHANGES(WITHOUT-1.0.x)
	* INDEX
	* INDEX_CN
	* INDEX_EN
	* CHANGES
* changes_all ALL-CHANGES
	* INDEX
	* INDEX_CN
	* INDEX_EN
	* CHANGES
	* CHANGES_10000
* getting_start GETTING-START
	* INDEX
	* INDEX_CN
	* INDEX_EN
	* CN_GETTING_START

# resource

* equal
	* GET / INDEX
	* GET /en/ INDEX_EN
	* GET /en/openresty.html INDEX_EN
	* GET /cn/ INDEX_CN
	* GET /cn/openresty.html INDEX_CN
	* GET /cn/changes.html CHANGES
	* GET /en/changes.html CHANGES
* prefix
	* ALL / DENY_ALL
	* GET /cn/ CN_ALL
	* GET /en/ EN_ALL
	* GET /fonts/ ALLOW_ALL
	* GET /images/ ALLOW_ALL
	* ALL /cn/changelog DENY_ALL
	* GET /cn/change CHANGES
	* ALL /en/changelog DENY_ALL
	* GET /en/changelog CHANGES
	* GET /en/changelog-10000 CHANGES_10000
	* GET /cn/changelog-10000 CHANGES_10000
	* GET /cn/getting-started.html CN_GETTING_START
* suffix
	* GET .css ALLOW_ALL
	* GET .jpg ALLOW_ALL
	* GET components.html COMPONENTS
	* GET resources.html RESOURCES
	* GET .tar.gz DOWNLOAD
	* GET .zip DOWNLOAD
	* GET .pdf DOWNLOAD