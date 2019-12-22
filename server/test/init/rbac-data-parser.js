const md2json = require('./md2json')

function getChildren(section) {
  const items = []
  if (section.children) {
    for (const child of section.children) {
      if (child.item) {
        items.push(child.item)
      }
    }
  }
  return items
}

function itemToObj(item) {
  const arr = item.split(/[ \t]+/, 3)
  const obj = {
    id: arr[0],
    name: arr[1],
    description: arr.length > 2 ? arr[2] : arr[1],
  }
  return obj
}

// Multi-level list indentation in markdown must be uniform, it is recommended to use tabs
function parseRbacData(rbacData) {
  const result = {
    applications: [],
    users: [],
    categories: [],
    permissions: [],
    roles: [],
    resources: [],
    accesses: [],
  }
  const sections = md2json.markdown2json(rbacData)
  // console.log('JSON:', JSON.stringify(json));
  for (const section of sections) {
    if (!section.h1) {
      continue
    }
    switch (section.h1) {
      case 'application':
        for (const item of getChildren(section)) {
          const application = itemToObj(item)
          result.applications.push(application)
        }
        break
      case 'user':
        for (const child of section.children) {
          if (child.item) {
            const arr = child.item.split(/[ \t]+/, 2)
            const user = {
              username: arr[0],
              nickname: arr[1],
            }
            if (child.children) {
              for (const permissionChild of child.children) {
                if (permissionChild.item === 'permission') {
                  const permIds = getChildren(permissionChild)
                  user.permIDs = permIds
                } else if (permissionChild.item === 'role') {
                  const roleIds = getChildren(permissionChild)
                  user.roleIDs = roleIds
                } else {
                  console.log('unknown permission type: [%s]', permissionChild.item)
                }
              }
            }
            result.users.push(user)
          }
        }
        break
      case 'category':
        for (const item of getChildren(section)) {
          const category = { name: item }
          result.categories.push(category)
        }
        break
      case 'permission':
        for (const child of section.children) {
          if (child.item) {
            const permission = itemToObj(child.item)
            const categories = getChildren(child)
            if (categories && categories.length > 0) {
              permission.category = categories[0]
            }
            result.permissions.push(permission)
          }
        }
        break
      case 'role':
        for (const child of section.children) {
          if (child.item) {
            const role = itemToObj(child.item)
            const permIds = getChildren(child)
            role.permIDs = permIds
            result.roles.push(role)
          }
        }
        break
      case 'resource':
        // console.log('>>resources:', section.children)
        for (const child of section.children) {
          const matchType = child.item
          const resourceInfos = getChildren(child)
          for (const resourceInfo of resourceInfos) {
            const arr = resourceInfo.split(/[ \t]+/, 3)
            const resource = {
              matchType: matchType,
              name: arr[1],
              action: arr[0],
              permID: arr[2],
            }
            result.resources.push(resource)
          }
        }
        break
      case 'access':
        for (const child of section.children) {
          const username = child.item
          const access = { username, actions: [] }
          if (child.children) {
            for (const actionChild of child.children) {
              const arr = actionChild.item.split(/[ \t]+/, 2)
              const action = {
                method: arr[0],
                url: arr[1],
                status: 200,
              }

              const returnChild = getChildren(actionChild)
              if (returnChild.length === 1) {
                action.status = parseInt(returnChild[0], 10)
                access.actions.push(action)
              }
            }
          }
          result.accesses.push(access)
        }
        break
    }
  }

  return result
}

exports.parseRbacData = parseRbacData
