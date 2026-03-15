import { $t } from "@/plugins/i18n";

const Layout = () => import("@/layout/index.vue");

// AI 助手（rank 0.5 使菜单排第一，且不被 utils.handRank 重写）
export default {
  path: "/ai",
  name: "AiChat",
  component: Layout,
  redirect: "/ai/chat",
  meta: {
    icon: "ep:chat-dot-round",
    title: $t("menus.wolfAiChat"),
    rank: 0.5
  },
  children: [
    {
      path: "/ai/chat",
      name: "AiChatPage",
      component: () => import("@/views/ai-chat/index.vue"),
      meta: {
        title: $t("menus.wolfAiChat")
      }
    }
  ]
} satisfies RouteConfigsTable;
