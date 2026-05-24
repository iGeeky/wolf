import { http, type WolfResponse } from "@/utils/http";
import { checkExist } from "@/api/common";

/** 角色类型 */
export interface WolfRole {
  id: string;
  appID: string;
  name: string;
  description?: string;
  permIDs?: string[];
  createTime?: number;
  updateTime?: number;
}

/** 角色列表结果 */
export type WolfRoleListResult = WolfResponse<{
  total: number;
  roles: WolfRole[];
}>;

/** 添加角色 */
export const addRole = (data: object) => {
  return http.request<WolfResponse>("post", "/role", { data });
};

/** 更新角色 */
export const updateRole = (id: string, data: object) => {
  return http.request<WolfResponse>("put", "/role", {
    data: { id, ...data }
  });
};

/** 删除角色 */
export const deleteRole = (id: string, appID: string) => {
  return http.request<WolfResponse>("delete", "/role", {
    data: { id, appID }
  });
};

/** 获取角色列表 */
export const listRoles = (params: object) => {
  return http.request<WolfRoleListResult>("get", "/role/list", { params });
};

/** 检查角色ID是否存在 */
export const checkRoleIDExist = async (appID: string, id: string) => {
  const value = { appID, id };
  return checkExist("role", value, {});
};

/** 检查角色名称是否存在 */
export const checkRoleNameExist = async (
  appID: string,
  name: string,
  excludeId?: string
) => {
  const value = { appID, name };
  const exclude: { id?: string } = {};
  if (excludeId) {
    exclude.id = excludeId;
  }
  return checkExist("role", value, exclude);
};
