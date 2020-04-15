local resty_cookie = require("resty.cookie")   -- https://github.com/cloudflare/lua-resty-cookie
local util = require("util")
local json = require("json")
local agent_pub = require("agent_pub")
local config = require("config")

local login_url = "/wolf/rbac/login.html"
local no_permission = "/wolf/rbac/no_permission"
local no_permission_html = "/wolf/rbac/no_permission.html"
local access_check_url = "/wolf/rbac/access_check"


function get_token()
	local cookie, err = resty_cookie:new()
    if not cookie then
        ngx.log(ngx.ERR, "resty_cookie:new() failed!", err)
        return nil
    end

    local token_key = "x-rbac-token"
	local token, err = cookie:get(token_key)
	return token
end

local function get_host_port()
    local host = ngx.var.host
    local port = ""
    if ngx.var.server_port and ngx.var.server_port ~= 80 then
        port = ":" .. tostring(ngx.var.server_port)
    end
    local host_port = (ngx.var.scheme or "http") .. "://" .. host .. port
    return host_port
end

local function url_args_as_args(ext_args)
	local args = ngx.req.get_uri_args()
    local host_port = get_host_port()

    local full_url = host_port .. ngx.var.uri
	args["return_to"] = full_url
	if ext_args and type(ext_args) == 'table' then
        for k, v in pairs(ext_args) do
			args[k] = v
		end
	end
	return args
end

local function check_url_permission(appID, action, resName, clientIP)
    local retry_max = 3
    local reason = nil;
    local userInfo = nil
	local res = nil
    for i = 1, retry_max do
        local args = { appID = appID, resName = resName, action = action, agentName=config.agentName, clientIP=clientIP}
        local url = access_check_url .. "?" .. ngx.encode_args(args)
        res = ngx.location.capture(url)
        if res then
            ngx.log(ngx.INFO, "check permission request:", url, ", status:", res.status, ",body:", tostring(res.body))
            if res.status < 500 then
                break
            else
                ngx.log(ngx.ERR, string.format("request [curl -v %s] failed! status:%d", url, res.status))
            end
        else
            reason = 'check permission failed, check request failed!'
            ngx.log(ngx.ERR, "fail request: ", url)
        end
    end
    if not res then
        return false, 500, reason
    end


    if res.status ~= 200 then
    	local strBody = util.trim(res.body or "")
        local body, err = json.loads(strBody)
	    if err then
            userInfo = res.body
            reason = 'check permission failed! parse response json failed!'
        else
            userInfo = body.data.userInfo
            reason = body.reason
	    end

        return false, res.status, reason, userInfo, res.headers
    else
    	local body, err = json.loads(res.body)
	    if err then
            userInfo = res.body
            reason = 'check permission failed! parse response json failed!'
            ngx.log(ngx.ERR, "json.loads(", res.body, ") failed! err:", err)
        else
            userInfo = body.data.userInfo
            reason = body.reason
        end

    	return true, res.status, reason, userInfo, res.headers
    end
end


local function url_redirect(url, args)
    local appID = ngx.var.appID or "appIDUnset"
    args.appid = appID
    args = ngx.encode_args(args)
    util.redirect(url, args)
end

local function access_check()
    local url = ngx.var.uri
    local action = ngx.req.get_method()
	if util.url_in_ignore_list(url) then
		ngx.log(ngx.INFO, "check permission, ignore current request!")
		return
	end

    local appID = ngx.var.appID or "appIDUnset"
    local clientIP = util.clientIP()
    local permItem = "{appID: " .. appID .. ", action: " .. action .. ", url: " .. url .. ", clientIP: " .. clientIP .. "}"
	ngx.log(ngx.INFO, "Cookie: ", ngx.var.http_cookie, ", permItem=", permItem)

	local token = get_token()
	if token == nil then
		ngx.log(ngx.WARN, "no permission to access ", permItem, ", need login!")
        url_redirect(login_url, url_args_as_args())
	elseif token == "logouted" then
		ngx.log(ngx.WARN, "logouted, no permission to access [", permItem, "], need login!")
        url_redirect(login_url, url_args_as_args())
	end

    ngx.ctx.token = token
    local ok, status, reason, userInfo, headers = check_url_permission(appID, action, url, clientIP)
	ngx.log(ngx.INFO, " check_url_permission(", permItem, ",token=", tostring(token), ")=",
        ok, ", status:", tostring(status), ", userInfo:", tostring(json.dumps(userInfo)))

    local userID = -1
	local username = nil
    local nickname = nil
    if type(userInfo) == 'table' then
        ngx.req.set_header("X-UserId", userInfo.id)
        ngx.req.set_header("X-Username", userInfo.username)
        ngx.req.set_header("X-nickname", ngx.escape_uri(userInfo.nickname) or userInfo.username)
        -- local args = ngx.req.get_uri_args()
		ngx.ctx.userInfo = userInfo
        userID = userInfo.id
		username = userInfo.username
        nickname = userInfo.nickname
	end
	if headers and headers["Set-Cookie"] then
		local cookie_value = headers["Set-Cookie"]
		ngx.header['Set-Cookie'] = cookie_value
		ngx.log(ngx.INFO, "******* Re Set-Cookie:", cookie_value, " *******")
    end
	if ok then
		---
	else
		-- no permission.
		if status == ngx.HTTP_UNAUTHORIZED then
			if reason == "ERR_TOKEN_INVALID" then
                url_redirect(login_url, url_args_as_args())
            else
                local redirect_url = no_permission
                if url == '/' then
                    redirect_url = no_permission_html
                end
                url_redirect(redirect_url, { username = username, reason=reason })
            end
        elseif status == ngx.HTTP_BAD_REQUEST then
            ngx.status = ngx.HTTP_INTERNAL_SERVER_ERROR
            ngx.header["Content-Type"] = "text/plain"
			ngx.send_headers()
			ngx.flush(true)
			ngx.say("rbac check permission failed! status:" .. tostring(status))
			ngx.flush(true)
		else
			ngx.status = status
            ngx.header["Content-Type"] = "text/plain"
			ngx.send_headers()
			ngx.flush(true)
			ngx.say("rbac check permission failed! status:" .. tostring(status))
			ngx.flush(true)
		end
	end
end

access_check()