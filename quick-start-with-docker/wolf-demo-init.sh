#!/bin/sh

docker exec -ti wolf-server ./node_modules/mocha/bin/mocha --timeout 10000 test/0-rbac-init.js --policyFile ./test/0-rbac-data-or.md --userPassword $1

docker exec -ti wolf-server ./node_modules/mocha/bin/mocha --timeout 10000 test/0-rbac-init.js --policyFile ./test/0-rbac-data-restful.md --userPassword $1

docker exec -ti wolf-server ./node_modules/mocha/bin/mocha --timeout 10000 test/0-rbac-init.js --policyFile ./test/0-rbac-data-demo.md --userPassword $1
