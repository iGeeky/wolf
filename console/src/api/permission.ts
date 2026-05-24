import { http, type WolfResponse } from "@/utils/http";
import { checkExist } from "@/api/common";
import { $t } from "@/plugins/i18n";

/** 权限类型 */
export interface WolfPermission {
  id: string;
  appID: string;
  name: string;
  description?: string;
  categoryID?: number;
  createTime?: number;
  updateTime?: number;
}

/** 权限列表结果 */
export type WolfPermissionListResult = WolfResponse<{
  total: number;
  permissions: WolfPermission[];
}>;

/** 添加权限 */
export const addPermission = (data: object) => {
  return http.request<WolfResponse>("post", "/permission", { data });
};

/** 更新权限 */
export const updatePermission = (id: string, data: object) => {
  return http.request<WolfResponse>("put", "/permission", {
    data: { id, ...data }
  });
};

/** 删除权限 */
export const deletePermission = (id: string, appID: string) => {
  return http.request<WolfResponse>("delete", "/permission", {
    data: { id, appID }
  });
};

/** 获取权限列表 */
export const listPermissions = (params: object) => {
  return http.request<WolfPermissionListResult>("get", "/permission/list", {
    params
  });
};

/** 获取系统权限选项 */
export const getSysPermissions = () => {
  const denyAll = { id: "DENY_ALL", name: $t("wolf.labelDenyAll") };
  const allowAll = { id: "ALLOW_ALL", name: $t("wolf.labelAllowAll") };
  return [denyAll, allowAll];
};

/** 检查权限ID是否存在 */
export const checkPermissionIDExist = async (appID: string, id: string) => {
  const value = { appID, id };
  return checkExist("permission", value, {});
};

/** 检查权限名称是否存在 */
export const checkPermissionNameExist = async (
  appID: string,
  name: string,
  excludeId?: string
) => {
  const value = { appID, name };
  const exclude: { id?: string } = {};
  if (excludeId) {
    exclude.id = excludeId;
  }
  return checkExist("permission", value, exclude);
};
