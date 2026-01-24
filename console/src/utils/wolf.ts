/**
 * Wolf 项目工具函数
 */

/**
 * 格式化 Unix 时间戳为日期字符串
 */
export function formatUnixTime(
  time: number,
  format = "{y}-{m}-{d} {h}:{i}:{s}"
): string {
  if (!time) return "";
  const date = new Date(time * 1000);
  const formatObj: Record<string, number> = {
    y: date.getFullYear(),
    m: date.getMonth() + 1,
    d: date.getDate(),
    h: date.getHours(),
    i: date.getMinutes(),
    s: date.getSeconds()
  };
  return format.replace(/{(y|m|d|h|i|s)+}/g, (result, key) => {
    const value = formatObj[key];
    return value < 10 ? "0" + value : String(value);
  });
}

/**
 * 字符串模板格式化
 * 支持 {key} 和 ${key} 两种格式
 * 例如: format("Hello {name}", {name: "World"}) => "Hello World"
 */
export function format(str: string, argObject: Record<string, any>): string {
  return str.replace(/\$?\{(.*?)\}/g, (_, g) => argObject[g] ?? "");
}

/**
 * 深拷贝对象
 */
export function deepClone<T>(source: T): T {
  if (source === null || typeof source !== "object") {
    return source;
  }
  if (Array.isArray(source)) {
    return source.map(item => deepClone(item)) as unknown as T;
  }
  const target = {} as T;
  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      target[key] = deepClone(source[key]);
    }
  }
  return target;
}

