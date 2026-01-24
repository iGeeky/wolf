import { http, type WolfResponse } from "@/utils/http";
import { checkExist } from "@/api/common";

/** 资源类型 */
export interface WolfResource {
  id: number;
  appID: string;
  matchType: string;
  name: string;
  action: string;
  priority?: number;
  permID?: string;
  createTime?: number;
  updateTime?: number;
}

/** 资源列表结果 */
export type WolfResourceListResult = WolfResponse<{
  total: number;
  resources: WolfResource[];
}>;

/** 资源选项结果 */
export type WolfResourceOptionsResult = WolfResponse<{
  matchTypes: { type: string; name: string }[];
  actions: { action: string; name: string }[];
}>;

/** 添加资源 */
export const addResource = (data: object) => {
  return http.request<WolfResponse>("post", "/resource", { data });
};

/** 更新资源 */
export const updateResource = (id: number, data: object) => {
  return http.request<WolfResponse>("put", "/resource", {
    data: { id, ...data }
  });
};

/** 删除资源 */
export const deleteResource = (id: number) => {
  return http.request<WolfResponse>("delete", "/resource", {
    data: { id }
  });
};

/** 获取资源列表 */
export const listResources = (params: object) => {
  return http.request<WolfResourceListResult>("get", "/resource/list", {
    params
  });
};

/** 检查资源是否存在 */
export const checkResourceExist = async (resource: {
  appID: string;
  matchType: string;
  name: string;
  action: string;
  id?: number;
}) => {
  const { appID, matchType, name, action, id } = resource;
  const value = { appID, matchType, name, action };
  const exclude: { id?: number } = {};
  if (id) {
    exclude.id = id;
  }
  return checkExist("resource", value, exclude);
};

/** 获取资源选项 */
export const getResourceOptions = async () => {
  const res = await http.request<WolfResourceOptionsResult>(
    "get",
    "/resource/options"
  );
  if (res.ok) {
    return res.data;
  }
  return null;
};

