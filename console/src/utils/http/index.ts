import Axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type CustomParamsSerializer
} from "axios";
import type {
  PureHttpError,
  RequestMethods,
  PureHttpResponse,
  PureHttpRequestConfig
} from "./types.d";
import { stringify } from "qs";
import { getWolfToken, removeToken } from "@/utils/auth";
import { message } from "@/utils/message";
import router from "@/router";

/** Wolf 后端响应格式 */
export interface WolfResponse<T = any> {
  ok: boolean;
  data?: T;
  errmsg?: string;
  reason?: string;
}

// 相关配置请参考：www.axios-js.com/zh-cn/docs/#axios-request-config-1
const defaultConfig: AxiosRequestConfig = {
  // Wolf 后端 baseURL
  // 开发环境使用代理 /wolf，生产环境使用完整 URL
  baseURL:
    import.meta.env.MODE === "production"
      ? import.meta.env.VITE_API_BASE_URL || "/wolf"
      : "/wolf",
  // 请求超时时间
  timeout: 10000,
  headers: {
    Accept: "application/json, text/plain, */*",
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest"
  },
  // 数组格式参数序列化（https://github.com/axios/axios/issues/5142）
  paramsSerializer: {
    serialize: stringify as unknown as CustomParamsSerializer
  }
};

/** 获取 i18n 错误消息 */
function getI18nMessage(errmsg: string, reason: string): string {
  // 错误码映射表
  const errorMessages: Record<string, string> = {
    ERR_ARGS_ERROR: "请求参数错误",
    ERR_TOKEN_INVALID: "非法的Token",
    TOKEN_USER_NOT_FOUND: "Token用户不存在",
    ERR_TOKEN_MISSING: "缺少Token",
    ERR_ACCESS_DENIED: "访问被阻止",
    ERR_DUPLICATE_KEY_ERROR: "重复的主键或唯一键",
    ERR_METHOD_INVALID: "非法的HTTP请求方法",
    ERR_SERVER_ERROR: "服务器内部错误",
    ERR_LDAP_CONFIG_NOT_FOUND: "找不到LDAP配置",
    ERR_USERNAME_MISSING: "缺少用户名",
    ERR_PASSWORD_MISSING: "缺少密码",
    ERR_CAPTCHA_INVALID: "验证码错误",
    ERR_APPID_NOT_FOUND: "Appid不存在",
    ERR_USER_NOT_FOUND: "用户不存在",
    ERR_PASSWORD_ERROR: "密码错误",
    ERR_USER_DISABLED: "账号已被禁用",
    ERR_PERMISSION_DENY: "没有权限执行此操作",
    ERR_LOGIN_NEED_SUPER_OR_ADMIN: "需要管理员用户来登录wolf管理台"
  };

  if (reason && errorMessages[reason]) {
    return errorMessages[reason];
  }
  if (errmsg && errorMessages[errmsg]) {
    return errorMessages[errmsg];
  }
  return errmsg || reason || "未知错误";
}

class PureHttp {
  constructor() {
    this.httpInterceptorsRequest();
    this.httpInterceptorsResponse();
  }

  /** 初始化配置对象 */
  private static initConfig: PureHttpRequestConfig = {};

  /** 保存当前`Axios`实例对象 */
  private static axiosInstance: AxiosInstance = Axios.create(defaultConfig);

  /** 请求拦截 */
  private httpInterceptorsRequest(): void {
    PureHttp.axiosInstance.interceptors.request.use(
      async (config: PureHttpRequestConfig): Promise<any> => {
        // 优先判断post/get等方法是否传入回调，否则执行初始化设置等回调
        if (typeof config.beforeRequestCallback === "function") {
          config.beforeRequestCallback(config);
          return config;
        }
        if (PureHttp.initConfig.beforeRequestCallback) {
          PureHttp.initConfig.beforeRequestCallback(config);
          return config;
        }

        // 请求白名单，不需要token的接口
        const whiteList = ["/user/login", "/user/loginOptions", "/captcha"];
        const isWhiteListed = whiteList.some(url => config.url?.endsWith(url));

        if (!isWhiteListed) {
          const token = getWolfToken();
          if (token) {
            // Wolf 使用 x-rbac-token header
            config.headers["x-rbac-token"] = token;
          }
        }

        return config;
      },
      error => {
        return Promise.reject(error);
      }
    );
  }

  /** 响应拦截 */
  private httpInterceptorsResponse(): void {
    const instance = PureHttp.axiosInstance;
    instance.interceptors.response.use(
      (response: PureHttpResponse) => {
        const $config = response.config;
        const res = response.data as WolfResponse;

        // 优先判断post/get等方法是否传入回调，否则执行初始化设置等回调
        if (typeof $config.beforeResponseCallback === "function") {
          $config.beforeResponseCallback(response);
          return response.data;
        }
        if (PureHttp.initConfig.beforeResponseCallback) {
          PureHttp.initConfig.beforeResponseCallback(response);
          return response.data;
        }

        // Wolf 响应格式处理
        if (res && res.ok === false) {
          const errmsg = getI18nMessage(res.errmsg || "", res.reason || "");
          message(errmsg, { type: "error" });
        }

        return response.data;
      },
      (error: PureHttpError) => {
        const $error = error;
        $error.isCancelRequest = Axios.isCancel($error);

        // 处理 HTTP 错误
        if (error.response) {
          const res = error.response.data as WolfResponse;
          let errmsg = "";

          if (res && res.reason) {
            errmsg = getI18nMessage(res.errmsg || "", res.reason);

            // Token 无效，跳转登录页
            if (res.reason === "ERR_TOKEN_INVALID") {
              removeToken();
              const toPath = router.currentRoute.value.fullPath || "/";
              router.push(`/login?redirect=${toPath}`);
            }
          } else {
            errmsg = `请求错误: ${error.message}`;
          }

          message(errmsg, { type: "error" });
        }

        return Promise.reject($error);
      }
    );
  }

  /** 通用请求工具函数 */
  public request<T>(
    method: RequestMethods,
    url: string,
    param?: AxiosRequestConfig,
    axiosConfig?: PureHttpRequestConfig
  ): Promise<T> {
    const config = {
      method,
      url,
      ...param,
      ...axiosConfig
    } as PureHttpRequestConfig;

    // 单独处理自定义请求/响应回调
    return new Promise((resolve, reject) => {
      PureHttp.axiosInstance
        .request(config)
        .then((response: undefined) => {
          resolve(response);
        })
        .catch(error => {
          reject(error);
        });
    });
  }

  /** 单独抽离的`post`工具函数 */
  public post<T, P>(
    url: string,
    params?: AxiosRequestConfig<P>,
    config?: PureHttpRequestConfig
  ): Promise<T> {
    return this.request<T>("post", url, params, config);
  }

  /** 单独抽离的`get`工具函数 */
  public get<T, P>(
    url: string,
    params?: AxiosRequestConfig<P>,
    config?: PureHttpRequestConfig
  ): Promise<T> {
    return this.request<T>("get", url, params, config);
  }
}

export const http = new PureHttp();
