import { http, type WolfResponse } from "@/utils/http";

/** 应用信息 */
export interface Application {
  id: string;
  name: string;
  description?: string;
  secret?: string;
  redirectUris?: string[];
  accessTokenLifetime?: number;
  refreshTokenLifetime?: number;
  createTime?: number;
}

/** 应用列表结果 */
export type ApplicationListResult = WolfResponse<{
  total: number;
  applications: Application[];
}>;

/** 应用图表结果 */
export type ApplicationDiagramResult = WolfResponse<{
  nodes: any[];
  edges: any[];
}>;

/** 应用密钥结果 */
export type ApplicationSecretResult = WolfResponse<{
  secret: string;
}>;

/** 查询参数 */
export interface ApplicationListParams {
  page?: number;
  limit?: number;
  key?: string;
  sort?: string;
}

/** 获取应用列表 */
export const listApplications = (params: ApplicationListParams) => {
  return http.request<ApplicationListResult>("get", "/application/list", {
    params
  });
};

/** 添加应用 */
export const addApplication = (data: Partial<Application>) => {
  return http.request<WolfResponse<Application>>("post", "/application", {
    data
  });
};

/** 更新应用 */
export const updateApplication = (id: string, data: Partial<Application>) => {
  return http.request<WolfResponse<Application>>("put", "/application", {
    data: { id, ...data }
  });
};

/** 删除应用 */
export const deleteApplication = (id: string) => {
  return http.request<WolfResponse>("delete", "/application", {
    data: { id }
  });
};

/** 获取应用密钥 */
export const getSecret = (id: string) => {
  return http.request<ApplicationSecretResult>("get", "/application/secret", {
    params: { id }
  });
};

/** 获取应用图表 */
export const applicationDiagram = (id: string) => {
  return http.request<ApplicationDiagramResult>("get", "/application/diagram", {
    params: { id }
  });
};

/** 获取所有应用 */
export const allApplications = () => {
  return http.request<WolfResponse<Application[]>>(
    "get",
    "/application/listAll"
  );
};

/** 检查应用ID是否存在 */
export const checkAppIdExist = async (id: string) => {
  const value = { id };
  return http.request<WolfResponse<{ exist: boolean }>>(
    "post",
    "/application/checkExist",
    { data: { value } }
  );
};

/** 检查应用名称是否存在 */
export const checkAppNameExist = async (
  name: string,
  excludeAppId?: string
) => {
  const value = { name };
  const exclude: { id?: string } = {};
  if (excludeAppId) {
    exclude.id = excludeAppId;
  }
  return http.request<WolfResponse<{ exist: boolean }>>(
    "post",
    "/application/checkExist",
    { data: { value, exclude } }
  );
};
