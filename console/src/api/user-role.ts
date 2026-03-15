import { http, type WolfResponse } from "@/utils/http";

/** 用户角色类型 */
export interface WolfUserRole {
  userID: string;
  appID: string;
  roleIDs?: string[];
  permIDs?: string[];
}

/** 用户角色结果 */
export type WolfUserRoleResult = WolfResponse<WolfUserRole>;

/** 设置用户角色 */
export const setUserRole = (data: WolfUserRole) => {
  return http.request<WolfResponse>("post", "/user-role/set", { data });
};

/** 删除用户角色 */
export const deleteUserRole = (userID: string, appID: string) => {
  return http.request<WolfResponse>("post", "/user-role/delete", {
    data: { userID, appID }
  });
};

/** 获取用户角色 */
export const getUserRole = (userID: string, appID: string) => {
  return http.request<WolfUserRoleResult>("get", "/user-role/get", {
    params: { userID, appID }
  });
};
