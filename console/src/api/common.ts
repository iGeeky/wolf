import { http, type WolfResponse } from "@/utils/http";

/** 通用检查是否存在接口 */
export const checkExist = async (
  model: string,
  value: object,
  exclude?: object
): Promise<{ ok: boolean; exist: boolean }> => {
  const data: { value: object; exclude?: object } = { value };
  if (exclude) {
    data.exclude = exclude;
  }
  try {
    const res = await http.request<WolfResponse<{ exist: boolean }>>(
      "post",
      `/${model}/checkExist`,
      { data }
    );
    if (res.ok) {
      return { ok: res.ok, exist: res.data?.exist ?? false };
    }
    return { ok: false, exist: false };
  } catch {
    return { ok: false, exist: false };
  }
};
