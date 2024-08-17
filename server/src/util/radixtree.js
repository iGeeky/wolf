const {
  createRouter,
  addRoute,
  findAllRoutes,
} = require('rou3')
const compileExpression = require('filtrex').compileExpression
const CIDRMatcher = require('cidr-matcher')

class RadixRouter {
  constructor() {
    this.router = createRouter()
    this.suffixRouter = createRouter()
    this.routes = []
    this.hasSuffixRoutes = false // New state bit
  }

  _processedPath(path) {
    let processedPath = path.split('').reverse().join('')
    processedPath = processedPath.replace('.', './')
    return processedPath
  }

  addRoute(config) {
    // Validate the required paths parameter
    if (!config.paths || !Array.isArray(config.paths) || config.paths.length === 0) {
      throw new Error('paths is required and must be a non-empty array')
    }
    const compiledExprs = config.exprs && config.exprs.length > 0
      ? config.exprs.map(expr => ({
        expr,
        compiledExpr: compileExpression(expr),
      }))
      : []
    // Process each path
    config.paths.forEach(path => {
      const route = {
        path,
        hosts: config.hosts,
        remoteAddrs: config.remoteAddrs,
        exprs: config.exprs,
        compiledExprs: compiledExprs,
        metadata: config.metadata,
        match: (req) => this.matchRoute(req, route),
        isSuffixMatch: path.startsWith('*'), // New property to mark if it's a suffix match
      }
      this.routes.push(route)

      let processedPath = path
      if (route.isSuffixMatch) {
        // Reverse the path for suffix matching
        processedPath = this._processedPath(path)
        this.hasSuffixRoutes = true // Set state bit to true
      }

      const targetRouter = route.isSuffixMatch ? this.suffixRouter : this.router
      this._addRouteWithMethods(targetRouter, config.methods, processedPath, route)
    })
  }

  _addRouteWithMethods(router, methods, path, route) {
    if (methods && methods.length > 0) {
      methods.forEach(method => {
        if (method === 'ALL') {
          method = ''
        }
        addRoute(router, method, path, route)
      })
    } else {
      addRoute(router, '', path, route)
    }
  }

  matchRoute(req, route) {
    // Check hosts
    const host = req.headers ? req.headers.host : ''
    if (route.hosts && !this.matchHosts(host, route.hosts)) {
      return false
    }

    // Check remoteAddrs
    if (route.remoteAddrs && !this.matchRemoteAddrs(req.remoteAddr, route.remoteAddrs)) {
      return false
    }

    // Check exprs
    if (route.compiledExprs && !this.matchExprs(req, route.compiledExprs)) {
      return false
    }

    return true
  }

  matchHosts(requestHost, configHosts) {
    if (!requestHost) {
      return false
    }
    return configHosts.some(host => {
      if (host.startsWith('*.')) {
        const domain = host.slice(2)
        return requestHost.endsWith(domain)
      }
      return host === requestHost
    })
  }

  matchRemoteAddrs(requestIp, configAddrs) {
    if (!requestIp) {
      return false
    }
    const normalizedAddrs = configAddrs.map(this.normalizeToCIDR)
    const matcher = new CIDRMatcher(normalizedAddrs)
    return matcher.contains(requestIp)
  }

  normalizeToCIDR(addr) {
    if (addr.includes('/')) {
      return addr // Already in CIDR format
    }
    // Check if it's an IPv4 address
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(addr)) {
      return addr + '/32' // Convert IPv4 address to CIDR
    }
    // Check if it's an IPv6 address
    if (/^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/.test(addr)) {
      return addr + '/128' // Convert IPv6 address to CIDR
    }
    throw new Error(`Invalid IP address format: ${addr}`)
  }

  matchExprs(req, compiledExprs) {
    if (!Array.isArray(compiledExprs)) {
      return false
    }

    const context = {
      method: req.method,
      path: req.path,
    }
    if (req.args) {
      for (let key in req.args) {
        key = key.toLowerCase()
        context[key] = req.args[key]
      }
    }
    if (req.headers) {
      for (const [key, value] of Object.entries(req.headers)) {
        const normalizedKey = key.toLowerCase().replace(/-/g, '_') // Replace - with _
        context[normalizedKey] = value
      }
    }

    for (const { expr, compiledExpr } of compiledExprs) {
      try {
        const result = compiledExpr(context)
        if (result instanceof Error) {
          console.error('## eval expr \n %s with %s \nerror: %s', expr, JSON.stringify(context), result)
          return false
        }
        if (!result) {
          return false
        }
      } catch (error) {
        console.error('Error evaluating filter:', error)
        return false
      }
    }

    return true
  }

  match(req) {
    // First try suffix matching if there are suffix routes
    if (this.hasSuffixRoutes) {
      const reversedPath = this._processedPath(req.path)
      const suffixMatches = findAllRoutes(this.suffixRouter, req.method, reversedPath)
      suffixMatches.reverse()
      if (suffixMatches.length > 0) {
        for (const result of suffixMatches) {
          if (result.data.match(req)) {
            return {
              matched: true,
              route: result.data,
              metadata: result.data.metadata,
            }
          }
        }
      }
    }

    // If suffix matching fails, continue with regular matching
    const matchedRoutes = findAllRoutes(this.router, req.method, req.path)
    matchedRoutes.reverse()
    for (const result of matchedRoutes) {
      if (result.data.match(req)) {
        return {
          matched: true,
          route: result.data,
          metadata: result.data.metadata,
        }
      }
    }
    return { matched: false }
  }
}

module.exports = RadixRouter
