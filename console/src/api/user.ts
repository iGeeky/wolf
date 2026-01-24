import { http, type WolfResponse } from "@/utils/http";
import type { WolfUserInfo, WolfApplication } from "@/utils/auth";

/** Wolf 登录结果类型 */
export type WolfLoginResult = WolfResponse<{
  token: string;
  userInfo: WolfUserInfo;
  applications: WolfApplication[];
}>;

/** Wolf 用户信息结果 */
export type WolfUserInfoResult = WolfResponse<{
  userInfo: WolfUserInfo;
  applications: WolfApplication[];
}>;

/** Wolf 登录选项结果 */
export type WolfLoginOptionsResult = WolfResponse<{
  password: object;
  ldap: {
    supported: boolean;
    label?: string;
  };
  consoleLoginWithCaptcha: boolean;
}>;

/** Wolf 验证码结果 */
export type WolfCaptchaResult = WolfResponse<{
  cid: string;
  captcha: string;
}>;

/** 用户列表结果 */
export type WolfUserListResult = WolfResponse<{
  total: number;
  users: WolfUserInfo[];
}>;

/** 登录参数 */
export interface LoginParams {
  username: string;
  password: string;
  authType?: string;
  cid?: string;
  captchaText?: string;
}

/** 登录 */
export const login = (data: LoginParams) => {
  return http.request<WolfLoginResult>("post", "/user/login", { data });
};

/** 获取用户信息 */
export const getInfo = () => {
  return http.request<WolfUserInfoResult>("get", "/user/info");
};

/** 获取登录选项 (LDAP等) */
export const getLoginOptions = () => {
  return http.request<WolfLoginOptionsResult>("get", "/user/loginOptions");
};

/** 获取验证码 */
export const getCaptchaData = () => {
  return http.request<WolfCaptchaResult>("get", "/captcha");
};

/** 登出 */
export const logout = () => {
  return http.request<WolfResponse>("post", "/user/logout");
};

/** 用户列表 */
export const listUsers = (params: object) => {
  return http.request<WolfUserListResult>("get", "/user/list", { params });
};

/** 添加用户 */
export const addUser = (data: object) => {
  return http.request<WolfResponse>("post", "/user", { data });
};

/** 更新用户 */
export const updateUser = (id: string, data: object) => {
  return http.request<WolfResponse>("put", "/user", {
    data: { id, ...data }
  });
};

/** 删除用户 */
export const deleteUser = (id: string) => {
  return http.request<WolfResponse>("delete", "/user", { data: { id } });
};

/** 重置密码 */
export const resetPwd = (id: string) => {
  return http.request<WolfResponse<{ password: string }>>("put", "/user/reset_pwd", {
    data: { id }
  });
};

/** 检查用户名是否存在 */
export const checkUsernameExist = async (
  username: string,
  excludeUserId?: string
) => {
  const value = { username };
  const exclude: { id?: string } = {};
  if (excludeUserId) {
    exclude.id = excludeUserId;
  }
  return http.request<WolfResponse<{ exist: boolean }>>("post", "/user/checkExist", {
    data: { value, exclude }
  });
};
