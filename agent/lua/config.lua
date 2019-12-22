
local _M = {}

_M.sysname = 'WOLF-RBAC'
_M.agentName = 'wolf-agent'

--[[ ignore list
format：
	ignore_list = {
	equals={"/test", "/login"},
	suffix={".doc", ".jpg"},
	prefix={"/demo", "/error"},
	}
]]
_M.ignore_list = {
	equals={"/favicon.ico"},
	suffix={".js", ".css", ".ico"},
	prefix={}
}


-- Cookie config
_M.cookie_config = {key="x-rbac-token", path="/", expires=3600*24}

return _M