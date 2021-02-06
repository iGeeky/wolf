# application

* unused unused-application
* test01 test01
* test02 test02
* test03 test03
* test04 test04
* test05 test05
* test06 test06
* test07 test07
* test08 test08
* test09 test09
* test10 test10

# user


* un_index unused-index
	* permission
		* INDEX
		* INDEX_CN
		* INDEX_EN
* un_en unused-english
	* permission
		* INDEX
	* role
		* en
* un_cn unused-chinese
	* permission
		* INDEX
	* role
		* cn
* un_changes unused-changes-without-1.0.xx
	* permission
		* 
	* role
		* index
		* changes
* un_changes_all unused-changes
	* permission
		* 
	* role
		* index
		* changes
		* changes_all
* un_cn_getting_start cn-getting-start
	* permission
		* INDEX
		* INDEX_CN
	* role
* un_suffix_match components-resources
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
	* CN_GETTING_START

# resource

* equal
	* GET / INDEX
	* GET /en/ INDEX_EN
	* GET /en/unused.html INDEX_EN
	* GET /cn/ INDEX_CN
	* GET /cn/unused.html INDEX_CN
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