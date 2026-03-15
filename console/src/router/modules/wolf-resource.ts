import { $t } from "@/plugins/i18n";
import { wolf } from "@/router/enums";

const Layout = () => import("@/layout/index.vue");

// 资源管理
export default {
  path: "/resource",
  name: "Resource",
  component: Layout,
  redirect: "/resource/list",
  meta: {
    icon: "ep:document",
    title: $t("menus.wolfResource"),
    rank: wolf + 4
  },
  children: [
    {
      path: "/resource/list",
      name: "ResourceList",
      component: () => import("@/views/resource/index.vue"),
      meta: {
        title: $t("menus.wolfResource")
      }
    }
  ]
} satisfies RouteConfigsTable;
