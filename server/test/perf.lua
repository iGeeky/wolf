package.path = '/usr/local/openresty/lualib/?.lua;' .. package.path
package.cpath = "/usr/local/openresty/lualib/?.so;" .. package.cpath

local cjson = require("cjson")

local token = os.getenv("TOKEN")

local function random_choice(arr)
    if arr == nil then
        return nil
    end
	return arr[math.random(1, #arr)]
end


local function random_action()
    local actions = { "GET","GET","GET", "POST"}
    return random_choice(actions)
end

local function random_res_name()
    local res_names = {
        "/",
        "/en/",
        "/en/test",
        "/en/openresty.html",
        "/cn/",
        "/cn/test",
        "/cn/openresty.html",
        "/cn/changes.html",
        "/en/changes.html",
        "/fonts/",
        "/images/",
        "/cn/changelog",
        "/cn/change",
        "/en/changelog",
        "/en/changelog1",
        "/en/changelog2",
        "/en/changelog3",
        "/en/changelog4",
        "/en/changelog5",
        "/en/changelog6",
        "/en/changelog-10000",
        "/cn/changelog-10000",
        "/cn/getting-started.html",
        "test.css",
        "test.jpg",
        "test/components.html",
        "test/resources.html",
        "test.tar.gz",
        "test.zip",
        "test.pdf",

    }
    local res_name = random_choice(res_names)
    return res_name
end

function request()
    local method = "GET"
    local path = "/wolf/rbac/access_check"
    local headers = {}
    headers["Host"] = "wolf-server"
    headers["Content-Type"] = "application/json"
    headers["x-rbac-token"] = token
    local appID = "openresty"
    local action = random_action()
    local resName = random_res_name()
    local ip = "127.0.0.1"
    local args = string.format("appID=%s&action=%s&resName=%s&ip=%s", appID, action, resName, ip)
    wrk.method = method
    wrk.path = path .. "?" .. args
    wrk.headers = headers
    return wrk.format()
end

--[[
wrk -c 128 -t 64 -d 60 -s test/perf.lua http://127.0.0.1:12180
]]