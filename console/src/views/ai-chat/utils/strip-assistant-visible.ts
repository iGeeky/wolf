/**
 * 从展示用正文中去掉模型思考痕迹：`</think>` 块、成对 XML 标签等。
 * 与 server generate-title 中 stripXmlLikeTaggedBlocks 行为对齐。
 *
 * 流式场景下 `</think>` 尚未到达时，开放的 `<think>` 及其后所有内容也会被截断，
 * 避免思考文本在流式输出过程中短暂闪现。
 */
export function stripAssistantVisibleArtifacts(text: string): string {
  if (!text) return "";
  let s = text;
  // backtick 定界
  s = s.replace(/`think`[\s\S]*?`think`/gi, "");
  s = s.replace(/`\/think\/`[\s\S]*?`\/think\/`/gi, "");
  s = s.replace(/`reasoning`[\s\S]*?`reasoning`/gi, "");
  s = s.replace(/`\/reasoning\/`[\s\S]*?`\/reasoning\/`/gi, "");
  // 完整配对 XML 标签（迭代，处理嵌套）
  let prev: string;
  do {
    prev = s;
    s = s.replace(
      /<([A-Za-z][A-Za-z0-9_.:-]*)(?:\s[^>]*)?>[\s\S]*?<\/\1>/gi,
      ""
    );
  } while (s !== prev);
  // 流式未闭合的 think / reasoning 块：从开标签到字符串末尾全部截掉
  s = s.replace(
    /<(?:think|thinking|reasoning|thought)(?:\s[^>]*)?>[\s\S]*$/gi,
    ""
  );
  s = s.replace(/<[A-Za-z][A-Za-z0-9_.:-]*(?:\s[^>]*)?\/>/gi, "");
  s = s.replace(/<[^>]+>/g, "");
  return s;
}
