
local _M = {}

local config = require("config")

function _M.ifnull(var, value)
    if var == nil then
        return value
    end
    return var
end

function _M.trim (s)
    return (string.gsub(s, "^%s*(.-)%s*$", "%1"))
end

function _M.replace(s, s1, s2)
    local str = string.gsub(s, s1, s2)
    return str
end

function _M.endswith(str,endstr)
   return endstr=='' or string.sub(str,-string.len(endstr))==endstr
end

function _M.startswith(str,startstr)
   return startstr=='' or string.sub(str,1, string.len(startstr))==startstr
end

-- delimiter 应该是单个字符。如果是多个字符，表示以其中任意一个字符做分割。
function _M.split(s, delimiter)
    local result = {};
    for match in string.gmatch(s, "[^"..delimiter.."]+") do
        table.insert(result, match);
    end
    return result;
end


function _M.redirect(uri, args)
    local uri_and_args = uri 
    if args then
        uri_and_args = uri_and_args .. "?" .. args 
    end
    ngx.header['Location'] = uri_and_args
    ngx.exit(ngx.HTTP_MOVED_TEMPORARILY)
end

function _M.url_in_ignore_list(url)
    if config.ignore_list == nil then
        return false
    end
    local matched = false
    -- equals match
    if type(config.ignore_list.equals)=='table' then
        for i, item in ipairs(config.ignore_list.equals) do 
            if item == url then
                matched = true
                break
            end
        end
    end
    if matched then 
        return matched
    end

    -- suffix match
    if not matched and type(config.ignore_list.suffix)=='table' then
        for i, item in ipairs(config.ignore_list.suffix) do 
            if _M.endswith(url, item) then
                matched = true
                break
            end
        end
    end
    if matched then 
        return matched
    end

    -- prefix match
    if not matched and type(config.ignore_list.prefix)=='table' then
        for i, item in ipairs(config.ignore_list.prefix) do 
            if _M.startswith(url, item) then
                matched = true
                break
            end
        end
    end
    if matched then 
        return matched
    end

    return matched
end

function _M.localtime(seconds, format)
    seconds = tonumber(seconds)
    format = format or "%Y-%m-%d %H:%M:%S"
    return os.date(format, seconds)
end

function _M.clientIP()
    local headers = ngx.req.get_headers()
    local ip = headers["x-forwarded-for"]
    if ip == nil then
        ip = headers["x-real-ip"]
    end
    if ip == nil then
        ip = ngx.var.remote_addr
    end

    if type(ip) == 'table' then
        ip = ip[#ip]
    end

    return ip, ngx.var.country_code, ngx.var.city_name
end

return _M