local config = require("config")
local util = require("util")
local agent_pub = require("agent_pub")

local logout_url = "/wolf/rbac/logout"
local change_pwd_url = "/wolf/rbac/change_pwd.html"

local def_topbar_style = [[
<style type="text/css">
<!--
.rbac-topbar {
	top: 0px;
	height:30px;
	background-color: #E6E8E7;
	font-size: 12px;
	color: black;
	background-position: top;
	/* box-shadow: 0 1px 4px 0 rgb(30, 2, 2); */
	border-bottom: 1px solid rgba(0,0,0,0.12);
	padding: 5px;
	display: flex;
}
.rbac-sysname {
	width: 30%;
	text-align:left;
	padding-left:8px;
	padding-right:8px;
  display: flex;
	align-items: center;
}

.rbac-info {
	display: flex;
	width: 70%;
	justify-content: flex-end;
	align-items: center;
}

.rbac-info div {
	float: left;
	text-align:right;
	padding: 0px 8px;
	white-space:nowrap;
}
-->
</style>
]]



local topbar_tpl = [[
<div id="rbac-topbar" class="rbac-topbar">
	<div id="rbac-sysname" class="rbac-sysname">%s</div>
	<div id="rbac-info" class="rbac-info"> 
	    <div id="rbac-username" class="rbac-username">USER: %s(%s)</div>
	    <div id="rbac-password" class="rbac-password"><a %s>Change Password</a></div>
	    <div id="rbac-logout" class="rbac-logout"><a href="%s" target="_self">Logout</a></div>
	</div>
</div>
]]

local function get_style()
	return def_topbar_style
end

local function get_infobar()
	local username = "NONE"
	local nickname = "UNKNOW"
	local userInfo = ngx.ctx.userInfo
	if userInfo then
		username = userInfo.username
		nickname = userInfo.nickname or ''
	elseif ngx.var.arg_username then
		username = ngx.var.arg_username
		nickname = ngx.var.arg_nickname or ''
	end
	local href = string.format([[href="%s"  target="_blank"]], change_pwd_url)
	if config.not_allow_change_pwd then
		href = string.format([[href="#" onclick="javascript:alert('Password change is not allowed');"]])
	end
	ngx.log(ngx.INFO, "user [", username, "](", nickname, ") request...")
	local replace = get_style() .. string.format(topbar_tpl, config.sysname or 'WOLF-RBAC', username, nickname, href, logout_url)
	return true, replace
end


ngx.log(ngx.DEBUG, "url:", ngx.var.uri)
if agent_pub.need_replace() then
	local ok, infobar = get_infobar()
	if ok then
		local n = nil
		if ngx.var.uri == "/" or util.endswith(ngx.var.uri, "/") then 
			ngx.arg[1], n =  ngx.re.sub(ngx.arg[1], "\\<body[^\\>]*\\>", "$0 " .. infobar , "jom")
		else
			ngx.arg[1] =  ngx.re.sub(ngx.arg[1], [[<div id="rbac" style="display:none"></div>]], infobar , "jom")
		end
		ngx.ctx.topbar_added = (n==1)
		ngx.log(ngx.INFO, "### add infobar. ### n:", tostring(ngx.ctx.topbar_added))
	end
else
    ngx.log(ngx.INFO, "---- ignore url: ", ngx.var.uri);
end