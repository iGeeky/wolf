import { http, type WolfResponse } from "@/utils/http";

/** 访问日志类型 */
export interface WolfAccessLog {
  id: number;
  appID: string;
  userID: string;
  username: string;
  nickname?: string;
  action: string;
  resName: string;
  matchedResource?: object;
  status: number;
  body?: object;
  contentType?: string;
  date: string;
  accessTime: number;
  ip: string;
}

/** 访问日志列表结果 */
export type WolfAccessLogListResult = WolfResponse<{
  total: number;
  accessLogs: WolfAccessLog[];
}>;

/** 获取访问日志列表 */
export const listAccessLogs = (params: object) => {
  return http.request<WolfAccessLogListResult>("get", "/access-log/list", {
    params
  });
};
