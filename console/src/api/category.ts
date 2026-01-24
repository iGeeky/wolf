import { http, type WolfResponse } from "@/utils/http";
import { checkExist } from "@/api/common";

/** 分类类型 */
export interface WolfCategory {
  id: number;
  appID: string;
  name: string;
  createTime?: number;
  updateTime?: number;
}

/** 分类列表结果 */
export type WolfCategoryListResult = WolfResponse<{
  total: number;
  categorys: WolfCategory[];
}>;

/** 添加分类 */
export const addCategory = (data: object) => {
  return http.request<WolfResponse>("post", "/category", { data });
};

/** 更新分类 */
export const updateCategory = (id: number, data: object) => {
  return http.request<WolfResponse>("put", "/category", {
    data: { id, ...data }
  });
};

/** 删除分类 */
export const deleteCategory = (id: number) => {
  return http.request<WolfResponse>("delete", "/category", {
    data: { id }
  });
};

/** 获取分类列表 */
export const listCategorys = (params: object) => {
  return http.request<WolfCategoryListResult>("get", "/category/list", {
    params
  });
};

/** 检查分类名称是否存在 */
export const checkCategoryNameExist = async (
  appID: string,
  name: string,
  excludeId?: number
) => {
  const value = { appID, name };
  const exclude: { id?: number } = {};
  if (excludeId) {
    exclude.id = excludeId;
  }
  return checkExist("category", value, exclude);
};

