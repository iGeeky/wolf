<template>
  <div class="message-bubble" :class="bubbleClass">
    <div class="bubble-avatar">
      <el-avatar v-if="message.role === 'user'" size="small" :icon="User" />
      <el-avatar
        v-else
        size="small"
        :icon="ChatDotRound"
        style="background: #6366f1"
      />
    </div>
    <div class="bubble-body">
      <!-- 用户消息 -->
      <div v-if="message.role === 'user'" class="bubble-text user-text">
        {{ message.text }}
      </div>

      <!-- 助手消息 -->
      <div v-else class="bubble-content">
        <!-- 工具调用卡片列表 -->
        <div
          v-if="message.toolCalls && message.toolCalls.length > 0"
          class="tool-calls"
        >
          <ToolCallCard
            v-for="tc in message.toolCalls"
            :key="tc.toolCallId"
            :toolCall="tc"
          />
        </div>

        <!-- 处理中三点动效 -->
        <div v-if="message.streaming && !message.text" class="thinking-dots">
          <span /><span /><span />
        </div>

        <!-- Markdown 渲染容器 -->
        <div
          v-if="message.text"
          ref="contentEl"
          class="assistant-text md-body"
          @click="handleContentClick"
          v-html="renderedHtml"
        />

        <!-- Token 使用情况 -->
        <div v-if="message.tokenUsage" class="token-usage">
          <el-icon><Coin /></el-icon>
          {{ message.tokenUsage.input }}↑ {{ message.tokenUsage.output }}↓
          <span v-if="message.tokenUsage.cost > 0">
            ${{ message.tokenUsage.cost.toFixed(4) }}
          </span>
        </div>
      </div>
    </div>
  </div>

  <!-- Mermaid 全屏预览 -->
  <Teleport to="body">
    <div
      v-if="lightboxVisible"
      class="mermaid-lightbox"
      @click.self="closeLightbox"
    >
      <div class="mermaid-lightbox-inner" v-html="lightboxSvg" />
      <button
        class="mermaid-lightbox-close"
        :title="t('wolf.aiChat.mermaidClose')"
        @click="closeLightbox"
      >
        ✕
      </button>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from "vue";
import { useI18n } from "vue-i18n";
import { User, ChatDotRound, Coin } from "@element-plus/icons-vue";
import { Marked } from "marked";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js";
import DOMPurify from "dompurify";
import mermaid from "mermaid";
import ToolCallCard from "./ToolCallCard.vue";
import type { DisplayMessage } from "../hooks/useChat";

import "highlight.js/styles/github-dark.css";

const { t } = useI18n();

mermaid.initialize({ startOnLoad: false, theme: "default" });

let mermaidIdCounter = 0;

const marked = new Marked(
  markedHighlight({
    langPrefix: "hljs language-",
    highlight(code: string, lang: string) {
      if (lang === "mermaid") return code;
      if (lang && hljs.getLanguage(lang)) {
        return hljs.highlight(code, { language: lang }).value;
      }
      return hljs.highlightAuto(code).value;
    }
  })
);

marked.setOptions({ gfm: true, breaks: true });

const mermaidRenderer = {
  code({ text, lang }: { text: string; lang?: string | null }) {
    if (lang === "mermaid") {
      const id = `mermaid-${++mermaidIdCounter}`;
      // 将原始源码同时持久化到 data-mermaid-src 中（encodeURIComponent 编码以
      // 兼容换行/引号等字符）。流式渲染中我们会把内容替换为加载占位符，
      // 此后无法再从 textContent 取回源码，dataset 是稳定的取源码渠道。
      const encoded = encodeURIComponent(text);
      return `<div class="mermaid-block" data-mermaid-id="${id}" data-mermaid-src="${encoded}">${escapeHtml(text)}</div>`;
    }
    return false as unknown as string;
  }
};
marked.use({ renderer: mermaidRenderer as any });

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

DOMPurify.addHook("uponSanitizeElement", (node, data) => {
  if (data.tagName === "div" && node instanceof HTMLElement) {
    if (node.classList.contains("mermaid-block")) {
      data.allowedTags["div"] = true;
    }
  }
});

function renderMarkdown(text: string): string {
  if (!text) return "";
  const raw = marked.parse(text) as string;
  return DOMPurify.sanitize(raw, {
    ADD_TAGS: ["div"],
    ADD_ATTR: ["class", "data-mermaid-id"],
    ALLOW_DATA_ATTR: true
  });
}

const props = defineProps<{
  message: DisplayMessage;
}>();

const contentEl = ref<HTMLElement | null>(null);

const renderedHtml = computed(() => renderMarkdown(props.message.text));

/**
 * Mermaid 渲染出的 SVG 默认带有 width="..."/height="..." 属性以及
 * inline style="max-width: Npx;"（flowchart.useMaxWidth=true 的副作用）。
 * 这会让 SVG 在容器变大时也无法跟着放大，行内显得偏小、全屏放大也撑不开。
 *
 * 这里把 width/height 属性和 inline 的 max-width 去掉，仅保留 viewBox，
 * 让 SVG 完全由外层 CSS 控制尺寸（矢量化缩放不会模糊）。
 */
function stripSvgSizeLimit(svgHtml: string): string {
  return svgHtml.replace(/<svg\b([^>]*)>/i, (_m, attrs: string) => {
    let cleaned = attrs
      .replace(/\swidth="[^"]*"/i, "")
      .replace(/\sheight="[^"]*"/i, "");
    cleaned = cleaned.replace(/\sstyle="([^"]*)"/i, (__m, s: string) => {
      const next = s
        .split(";")
        .map(p => p.trim())
        .filter(p => p && !/^max-width\s*:/i.test(p))
        .join("; ");
      return next ? ` style="${next}"` : "";
    });
    return `<svg${cleaned}>`;
  });
}

function readMermaidSource(block: HTMLElement): string {
  const enc = block.getAttribute("data-mermaid-src");
  if (enc) {
    try {
      return decodeURIComponent(enc);
    } catch {
      // ignore，回退到 textContent
    }
  }
  return block.textContent || "";
}

async function renderMermaidBlocks() {
  await nextTick();
  const el = contentEl.value;
  if (!el) return;
  const blocks = el.querySelectorAll<HTMLElement>(".mermaid-block");
  // 流式输出过程中，源码大概率不完整（半截围栏 / 半行语法），
  // mermaid.render 会失败或产出错误图表，且每个 chunk 都会重新触发，
  // 视觉上呈现「乱图 + 闪烁」。流式期间统一显示加载占位符，
  // 等流式结束（streaming 变 false）后再做一次正式渲染。
  const streaming = !!props.message.streaming;
  for (const block of blocks) {
    if (block.dataset.rendered === "1") continue;
    const source = readMermaidSource(block);
    if (!source.trim()) continue;

    if (streaming) {
      if (block.dataset.pending !== "1") {
        block.innerHTML =
          `<div class="mermaid-pending">` +
          `<span class="mermaid-pending-spinner"></span>` +
          `<span class="mermaid-pending-label">${escapeHtml(t("wolf.aiChat.mermaidPending"))}</span>` +
          `</div>`;
        block.dataset.pending = "1";
      }
      continue;
    }

    const id = block.dataset.mermaidId || `mermaid-${++mermaidIdCounter}`;
    try {
      const { svg } = await mermaid.render(id, source);
      block.innerHTML = stripSvgSizeLimit(svg);
      block.dataset.rendered = "1";
      block.dataset.zoomHint = t("wolf.aiChat.mermaidZoomHint");
      delete block.dataset.pending;
    } catch {
      block.textContent = source;
    }
  }
}

watch(renderedHtml, () => renderMermaidBlocks());
watch(
  () => props.message.streaming,
  s => {
    // 流式结束的瞬间，DOM 仍是占位符，此时再触发一次正式渲染
    if (!s) renderMermaidBlocks();
  }
);
onMounted(() => renderMermaidBlocks());

const bubbleClass = {
  "bubble-user": props.message.role === "user",
  "bubble-assistant": props.message.role === "assistant"
};

// ── Mermaid 全屏 lightbox ──────────────────────────────────────────────────
const lightboxVisible = ref(false);
const lightboxSvg = ref("");

function openLightbox(svgHtml: string) {
  lightboxSvg.value = svgHtml;
  lightboxVisible.value = true;
}

function closeLightbox() {
  lightboxVisible.value = false;
  lightboxSvg.value = "";
}

/** 点击 md-body 区域时，若点中已渲染的 mermaid 块则弹出全屏预览 */
function handleContentClick(e: MouseEvent) {
  const target = e.target as HTMLElement;
  const block = target.closest<HTMLElement>(
    ".mermaid-block[data-rendered='1']"
  );
  if (!block) return;
  const svgEl = block.querySelector("svg");
  if (!svgEl) return;
  openLightbox(svgEl.outerHTML);
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === "Escape") closeLightbox();
}

onMounted(() => {
  window.addEventListener("keydown", handleKeydown);
});
onUnmounted(() => {
  window.removeEventListener("keydown", handleKeydown);
});
</script>

<style scoped>
.message-bubble {
  display: flex;
  gap: 10px;
  padding: 6px 0;
}

.bubble-user {
  flex-direction: row-reverse;
}

.bubble-avatar {
  flex-shrink: 0;
  padding-top: 2px;
}

.bubble-body {
  max-width: 82%;
  min-width: 40px;
}

.bubble-user .bubble-body {
  display: flex;
  justify-content: flex-end;
}

.bubble-text {
  padding: 10px 14px;
  border-radius: 12px;
  line-height: 1.6;
  word-break: break-word;
}

.user-text {
  background: #6366f1;
  color: #fff;
  border-radius: 12px 12px 4px 12px;
  white-space: pre-wrap;
}

.bubble-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.assistant-text {
  background: #f5f5f7;
  border-radius: 4px 12px 12px 12px;
  font-size: 14px;
  padding: 10px 14px;
}

/* 三点处理中动效 */
.thinking-dots {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 10px 16px;
  background: #f5f5f7;
  border-radius: 4px 12px 12px 12px;
  width: fit-content;
}

.thinking-dots span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #6366f1;
  animation: dot-bounce 1.2s infinite ease-in-out;
}

.thinking-dots span:nth-child(1) { animation-delay: 0s; }
.thinking-dots span:nth-child(2) { animation-delay: 0.2s; }
.thinking-dots span:nth-child(3) { animation-delay: 0.4s; }

@keyframes dot-bounce {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
  30% { transform: translateY(-5px); opacity: 1; }
}

.tool-calls {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.token-usage {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #c0c4cc;
  padding: 0 2px;
}
</style>

<!-- Markdown 内容样式（非 scoped，作用于 v-html 输出） -->
<style>
.md-body {
  color: #1a1a2e;
  line-height: 1.7;
  word-break: break-word;
}

.md-body h1,
.md-body h2,
.md-body h3,
.md-body h4 {
  margin: 12px 0 6px;
  font-weight: 600;
  line-height: 1.4;
  color: #1a1a2e;
}
.md-body h1 { font-size: 18px; border-bottom: 1px solid #e4e7eb; padding-bottom: 4px; }
.md-body h2 { font-size: 16px; }
.md-body h3 { font-size: 15px; }

.md-body p { margin: 6px 0; }

.md-body ul,
.md-body ol {
  margin: 6px 0;
  padding-left: 20px;
}
.md-body li { margin: 3px 0; }

.md-body a { color: #6366f1; text-decoration: none; }
.md-body a:hover { text-decoration: underline; }

.md-body blockquote {
  border-left: 3px solid #6366f1;
  margin: 8px 0;
  padding: 4px 12px;
  color: #666;
  background: rgba(99, 102, 241, 0.05);
  border-radius: 0 4px 4px 0;
}

/* 表格 */
.md-body table {
  border-collapse: collapse;
  width: 100%;
  margin: 8px 0;
  font-size: 13px;
}
.md-body th,
.md-body td {
  border: 1px solid #d0d5dd;
  padding: 6px 10px;
  text-align: left;
}
.md-body th { background: #e9ecf4; font-weight: 600; }
.md-body tr:nth-child(even) td { background: #f0f2f8; }

/* 代码块 */
.md-body pre {
  background: #1a1a2e;
  color: #e2e8f0;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 13px;
  overflow-x: auto;
  margin: 8px 0;
}
.md-body code {
  font-family: "Fira Code", "Consolas", monospace;
}
.md-body p > code,
.md-body li > code {
  background: rgba(99, 102, 241, 0.1);
  color: #6366f1;
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 0.9em;
}

/* Mermaid */
.md-body .mermaid-block {
  position: relative;
  display: block;
  margin: 10px 0;
  overflow-x: auto;
}
.md-body .mermaid-block svg {
  width: 100%;
  max-width: 100%;
  height: auto;
  display: block;
  margin: 0 auto;
}

/* 已渲染的 mermaid 块：鼠标指针 + hover 放大提示 */
.md-body .mermaid-block[data-rendered="1"] {
  cursor: zoom-in;
}
.md-body .mermaid-block[data-rendered="1"]::after {
  content: attr(data-zoom-hint);
  position: absolute;
  bottom: 6px;
  right: 8px;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.45);
  color: #fff;
  font-size: 11px;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.2s;
}
.md-body .mermaid-block[data-rendered="1"]:hover::after {
  opacity: 1;
}

/* 流式输出过程中 mermaid 块的占位符 */
.md-body .mermaid-pending {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border: 1px dashed #c0c4cc;
  border-radius: 6px;
  background: #fafafa;
  color: #909399;
  font-size: 13px;
}
.md-body .mermaid-pending-spinner {
  width: 12px;
  height: 12px;
  border: 2px solid #d6dbe5;
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: mermaid-pending-rotate 0.9s linear infinite;
}
@keyframes mermaid-pending-rotate {
  to {
    transform: rotate(360deg);
  }
}

/* ── Mermaid 全屏 lightbox ─────────────────────────────────────────────── */
.mermaid-lightbox {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.82);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: mermaid-lightbox-fadein 0.18s ease;
  cursor: zoom-out;
}
@keyframes mermaid-lightbox-fadein {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
.mermaid-lightbox-inner {
  width: 96vw;
  max-height: 92vh;
  overflow: auto;
  background: #fff;
  border-radius: 10px;
  padding: 16px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.5);
  cursor: auto;
  box-sizing: border-box;
}
.mermaid-lightbox-inner svg {
  width: 100%;
  max-width: 100%;
  height: auto;
  display: block;
}
.mermaid-lightbox-close {
  position: absolute;
  top: 16px;
  right: 20px;
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}
.mermaid-lightbox-close:hover {
  background: rgba(255, 255, 255, 0.32);
}
</style>
