import { $t } from "@/plugins/i18n";
import { wolf } from "@/router/enums";

const Layout = () => import("@/layout/index.vue");

// 审计日志
export default {
  path: "/audit",
  name: "Audit",
  component: Layout,
  redirect: "/audit/log",
  meta: {
    icon: "ep:document-copy",
    title: $t("menus.wolfAuditLog"),
    rank: wolf + 5
  },
  children: [
    {
      path: "/audit/log",
      name: "AuditLog",
      component: () => import("@/views/access-log/index.vue"),
      meta: {
        title: $t("menus.wolfAuditLog")
      }
    }
  ]
} satisfies RouteConfigsTable;

