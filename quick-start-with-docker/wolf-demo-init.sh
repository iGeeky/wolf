#!/bin/sh

docker exec -ti wolf-server ./node_modules/mocha/bin/_mocha --timeout 10000 test/init/0-rbac-init.js --server 'http://127.0.0.1:12180' --policyFile ./test/init/0-rbac-data-or.md --userPassword $1

docker exec -ti wolf-server ./node_modules/mocha/bin/_mocha --timeout 10000 test/init/0-rbac-init.js --server 'http://127.0.0.1:12180' --policyFile ./test/init/0-rbac-data-restful.md --userPassword $1

docker exec -ti wolf-server ./node_modules/mocha/bin/_mocha --timeout 10000 test/init/0-rbac-init.js --server 'http://127.0.0.1:12180' --policyFile ./test/init/0-rbac-data-demo.md --userPassword $1
