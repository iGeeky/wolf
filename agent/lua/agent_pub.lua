
local _M = {}

local login_url = "/wolf/rbac/login.html"
local login_post_url = "/wolf/rbac/login.submit"
local logout_url = "/wolf/rbac/logout"
local no_permission = "/wolf/rbac/no_permission"
local no_permission_html = "/wolf/rbac/no_permission.html"
local access_check_url = "/wolf/rbac/access_check"
local change_pwd_url = "/wolf/rbac/change_pwd.html"
local change_pwd_post_url = "/wolf/rbac/change_pwd.submit"


local ignore_list = {login_url, login_post_url,logout_url,no_permission,no_permission_html,access_check_url, change_pwd_url, change_pwd_post_url}

function _M.is_ignore_url(url)
    if ignore_list == nil then
        return false
    end
    local matched = false
    if type(ignore_list)=='table' then
        for i, item in ipairs(ignore_list) do 
            if item == url then
                matched = true
                break
            end
        end
    end
    return matched
end

local function split(s, delimiter)
    local result = {};
    for match in string.gmatch(s, "[^"..delimiter.."]+") do
        table.insert(result, match);
    end
    return result;
end

local function need_replace_internal()
    if _M.is_ignore_url(ngx.var.uri) then
        ngx.log(ngx.INFO, "### filter ignore : ", ngx.var.uri)
        return false
    end
    local contentType = ngx.header["Content-Type"]
    if contentType == nil then 
       ngx.log(ngx.INFO, "---- ignore type: ", tostring(contentType));
       return false
    end
    local arr = split(contentType, ";")
    contentType = arr[1]

    return contentType == "text/plain" or contentType == "text/html"
end

function _M.need_replace()
    if ngx.ctx.need_replace == nil then 
        ngx.ctx.need_replace = need_replace_internal()
    end
    return ngx.ctx.need_replace
end

return _M