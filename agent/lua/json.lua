local cjson = require "cjson"

local _M = {}


cjson.encode_empty_table_as_object(false)

function _M.loads(str)
    local ok, jso = pcall(function() return cjson.decode(str) end)
    if ok then
        return jso
    else
        return nil, jso
    end
end

local function is_json_simple(str)
    local fc = string.sub(str,1, 1)
    local lc = string.sub(str, -1)
    if fc == "{" and lc == "}" then 
        return true 
    elseif fc == "[" and lc == "]" then 
        return true 
    end
    return false
end

function _M.tryloads(str)
    if type(str) == 'string' then 
        if is_json_simple(str) then 
            local ok, jso = pcall(function() return cjson.decode(str) end)
            if ok then
                return jso
            end
        end
    end
    return str
end

function _M.dumps(tab)
    if tab and type(tab) == 'table' then
        return cjson.encode(tab)
    else
        return tostring(tab)
    end
end


return _M