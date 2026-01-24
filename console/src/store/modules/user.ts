import { defineStore } from "pinia";
import {
  type userType,
  type WolfAppType,
  store,
  router,
  resetRouter,
  routerArrays,
  storageLocal
} from "../utils";
import {
  type WolfLoginResult,
  type LoginParams,
  login,
  getInfo,
  logout
} from "@/api/user";
import { useMultiTagsStoreHook } from "./multiTags";
import {
  type DataInfo,
  setToken,
  removeToken,
  userKey,
  WolfApplicationsKey,
  WolfCurrentAppKey
} from "@/utils/auth";

export const useUserStore = defineStore("pure-user", {
  state: (): userType => ({
    // 头像
    avatar: storageLocal().getItem<DataInfo<number>>(userKey)?.avatar ?? "",
    // 用户名
    username: storageLocal().getItem<DataInfo<number>>(userKey)?.username ?? "",
    // 昵称
    nickname: storageLocal().getItem<DataInfo<number>>(userKey)?.nickname ?? "",
    // 页面级别权限
    roles: storageLocal().getItem<DataInfo<number>>(userKey)?.roles ?? [],
    // 按钮级别权限
    permissions:
      storageLocal().getItem<DataInfo<number>>(userKey)?.permissions ?? [],
    // 前端生成的验证码（按实际需求替换）
    verifyCode: "",
    // 判断登录页面显示哪个组件（0：登录（默认）、1：LDAP登录）
    currentPage: 0,
    // 是否勾选了登录页的免登录
    isRemembered: false,
    // 登录页的免登录存储几天，默认7天
    loginDay: 7,
    // Wolf 应用列表
    applications:
      storageLocal().getItem<WolfAppType[]>(WolfApplicationsKey) ?? [],
    // Wolf 当前应用ID
    currentApp: storageLocal().getItem<string>(WolfCurrentAppKey) ?? ""
  }),
  actions: {
    /** 存储头像 */
    SET_AVATAR(avatar: string) {
      this.avatar = avatar;
    },
    /** 存储用户名 */
    SET_USERNAME(username: string) {
      this.username = username;
    },
    /** 存储昵称 */
    SET_NICKNAME(nickname: string) {
      this.nickname = nickname;
    },
    /** 存储角色 */
    SET_ROLES(roles: Array<string>) {
      this.roles = roles;
    },
    /** 存储按钮级别权限 */
    SET_PERMS(permissions: Array<string>) {
      this.permissions = permissions;
    },
    /** 存储前端生成的验证码 */
    SET_VERIFYCODE(verifyCode: string) {
      this.verifyCode = verifyCode;
    },
    /** 存储登录页面显示哪个组件 */
    SET_CURRENTPAGE(value: number) {
      this.currentPage = value;
    },
    /** 存储是否勾选了登录页的免登录 */
    SET_ISREMEMBERED(bool: boolean) {
      this.isRemembered = bool;
    },
    /** 设置登录页的免登录存储几天 */
    SET_LOGINDAY(value: number) {
      this.loginDay = Number(value);
    },
    /** 存储 Wolf 应用列表 */
    SET_APPLICATIONS(applications: Array<WolfAppType>) {
      this.applications = applications;
      storageLocal().setItem(WolfApplicationsKey, applications);
    },
    /** 存储 Wolf 当前应用 */
    SET_CURRENTAPP(appId: string) {
      this.currentApp = appId;
      storageLocal().setItem(WolfCurrentAppKey, appId);
    },
    /** Wolf 登录 */
    async loginByUsername(data: LoginParams) {
      return new Promise<WolfLoginResult>((resolve, reject) => {
        login(data)
          .then(res => {
            if (res?.ok) {
              setToken(res.data);
              // 转换为兼容格式
              resolve({ ...res, success: res.ok } as any);
            } else {
              resolve({ ...res, success: false } as any);
            }
          })
          .catch(error => {
            reject(error);
          });
      });
    },
    /** 获取用户信息 */
    async getUserInfo() {
      return new Promise((resolve, reject) => {
        getInfo()
          .then(res => {
            if (res?.ok && res.data) {
              const { userInfo, applications } = res.data;
              this.SET_USERNAME(userInfo.username);
              this.SET_NICKNAME(userInfo.nickname || "");
              this.SET_ROLES(
                userInfo.manager === "super" ? ["admin"] : ["user"]
              );

              if (applications && applications.length > 0) {
                this.SET_APPLICATIONS(applications);
                // 检查当前应用是否有效
                if (
                  !this.currentApp ||
                  !applications.find(app => app.id === this.currentApp)
                ) {
                  this.SET_CURRENTAPP(applications[0].id);
                }
              }

              resolve(res.data);
            } else {
              reject("获取用户信息失败");
            }
          })
          .catch(error => {
            reject(error);
          });
      });
    },
    /** 登出（调用接口） */
    async logOut() {
      try {
        await logout();
      } catch (e) {
        console.error("Logout error:", e);
      }
      this.username = "";
      this.nickname = "";
      this.roles = [];
      this.permissions = [];
      this.applications = [];
      this.currentApp = "";
      removeToken();
      useMultiTagsStoreHook().handleTags("equal", [...routerArrays]);
      resetRouter();
      router.push("/login");
    }
  }
});

export function useUserStoreHook() {
  return useUserStore(store);
}
