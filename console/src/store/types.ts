import type { RouteRecordName } from "vue-router";

export type cacheType = {
  mode: string;
  name?: RouteRecordName;
};

export type positionType = {
  startIndex?: number;
  length?: number;
};

export type appType = {
  sidebar: {
    opened: boolean;
    withoutAnimation: boolean;
    // 判断是否手动点击Collapse
    isClickCollapse: boolean;
  };
  layout: string;
  device: string;
  viewportSize: { width: number; height: number };
  sortSwap: boolean;
};

export type multiType = {
  path: string;
  name: string;
  meta: any;
  query?: object;
  params?: object;
};

export type setType = {
  title: string;
  fixedHeader: boolean;
  hiddenSideBar: boolean;
};

/** Wolf 应用类型 */
export type WolfAppType = {
  id: string;
  name: string;
  description?: string;
};

export type userType = {
  avatar?: string;
  username?: string;
  nickname?: string;
  roles?: Array<string>;
  permissions?: Array<string>;
  verifyCode?: string;
  currentPage?: number;
  isRemembered?: boolean;
  loginDay?: number;
  /** Wolf 应用列表 */
  applications?: Array<WolfAppType>;
  /** Wolf 当前应用ID */
  currentApp?: string;
};
