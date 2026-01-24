import Cookies from "js-cookie";
import { useUserStoreHook } from "@/store/modules/user";
import { storageLocal, isString, isIncludeAllChildren } from "@pureadmin/utils";

export interface DataInfo<T> {
  /** token */
  accessToken: string;
  /** `accessToken`的过期时间（时间戳） */
  expires: T;
  /** 用于调用刷新accessToken的接口时所需的token */
  refreshToken?: string;
  /** 头像 */
  avatar?: string;
  /** 用户名 */
  username?: string;
  /** 昵称 */
  nickname?: string;
  /** 当前登录用户的角色 */
  roles?: Array<string>;
  /** 当前登录用户的按钮级别权限 */
  permissions?: Array<string>;
}

/** Wolf 用户信息接口 */
export interface WolfUserInfo {
  id: string;
  username: string;
  nickname?: string;
  email?: string;
  tel?: string;
  appIDs?: string[];
  manager?: string;
  status?: number;
}

/** Wolf 应用信息接口 */
export interface WolfApplication {
  id: string;
  name: string;
  description?: string;
}

export const userKey = "user-info";
export const TokenKey = "authorized-token";
export const WolfTokenKey = "x-rbac-token";
export const WolfApplicationsKey = "wolf-applications";
export const WolfCurrentAppKey = "wolf-current-app";

/**
 * 通过`multiple-tabs`是否在`cookie`中，判断用户是否已经登录系统，
 * 从而支持多标签页打开已经登录的系统后无需再登录。
 * 浏览器完全关闭后`multiple-tabs`将自动从`cookie`中销毁，
 * 再次打开浏览器需要重新登录系统
 * */
export const multipleTabsKey = "multiple-tabs";

/** 获取`token` */
export function getToken(): DataInfo<number> {
  // 优先从 Cookie 获取 Wolf token
  const wolfToken = Cookies.get(WolfTokenKey);
  if (wolfToken) {
    const userInfo = storageLocal().getItem<DataInfo<number>>(userKey);
    return {
      accessToken: wolfToken,
      expires: userInfo?.expires ?? Date.now() + 86400000,
      ...userInfo
    };
  }
  // 兼容原有逻辑
  return Cookies.get(TokenKey)
    ? JSON.parse(Cookies.get(TokenKey))
    : storageLocal().getItem(userKey);
}

/** 获取 Wolf token 字符串 */
export function getWolfToken(): string {
  return Cookies.get(WolfTokenKey) || "";
}

/**
 * @description 设置 Wolf token 以及用户信息
 */
export function setToken(data: DataInfo<Date> | any) {
  const { isRemembered, loginDay } = useUserStoreHook();

  // Wolf 登录返回的 token
  if (data.token) {
    Cookies.set(WolfTokenKey, data.token, {
      expires: isRemembered ? loginDay : undefined
    });
  } else if (data.accessToken) {
    // 兼容原有格式
    Cookies.set(WolfTokenKey, data.accessToken, {
      expires: isRemembered ? loginDay : undefined
    });
  }

  Cookies.set(
    multipleTabsKey,
    "true",
    isRemembered ? { expires: loginDay } : {}
  );

  // 保存用户信息
  const userInfo = data.userInfo || data;
  if (userInfo) {
    const username = userInfo.username || "";
    const nickname = userInfo.nickname || "";
    const roles = userInfo.manager === "super" ? ["admin"] : ["user"];

    useUserStoreHook().SET_USERNAME(username);
    useUserStoreHook().SET_NICKNAME(nickname);
    useUserStoreHook().SET_ROLES(roles);

    storageLocal().setItem(userKey, {
      accessToken: data.token || data.accessToken,
      expires: Date.now() + 86400000, // 默认1天过期
      username,
      nickname,
      roles,
      permissions: []
    });
  }

  // 保存应用列表
  if (data.applications) {
    storageLocal().setItem(WolfApplicationsKey, data.applications);
    useUserStoreHook().SET_APPLICATIONS(data.applications);
    // 设置默认当前应用
    if (data.applications.length > 0) {
      const currentApp =
        storageLocal().getItem<string>(WolfCurrentAppKey) ||
        data.applications[0].id;
      setCurrentApp(currentApp);
    }
  }
}

/** 删除`token`以及key值为`user-info`的localStorage信息 */
export function removeToken() {
  Cookies.remove(TokenKey);
  Cookies.remove(WolfTokenKey);
  Cookies.remove(multipleTabsKey);
  storageLocal().removeItem(userKey);
  storageLocal().removeItem(WolfApplicationsKey);
  storageLocal().removeItem(WolfCurrentAppKey);
}

/** 格式化token（Wolf 不需要 Bearer 前缀） */
export const formatToken = (token: string): string => {
  return token;
};

/** 获取当前应用 */
export function getCurrentApp(): string {
  return storageLocal().getItem<string>(WolfCurrentAppKey) || "";
}

/** 设置当前应用 */
export function setCurrentApp(appId: string) {
  storageLocal().setItem(WolfCurrentAppKey, appId);
  useUserStoreHook().SET_CURRENTAPP(appId);
}

/** 获取应用列表 */
export function getApplications(): WolfApplication[] {
  return storageLocal().getItem<WolfApplication[]>(WolfApplicationsKey) || [];
}

/** 是否有按钮级别的权限（根据登录接口返回的`permissions`字段进行判断）*/
export const hasPerms = (value: string | Array<string>): boolean => {
  if (!value) return false;
  const allPerms = "*:*:*";
  const { permissions } = useUserStoreHook();
  if (!permissions) return false;
  if (permissions.length === 1 && permissions[0] === allPerms) return true;
  const isAuths = isString(value)
    ? permissions.includes(value)
    : isIncludeAllChildren(value, permissions);
  return isAuths ? true : false;
};
