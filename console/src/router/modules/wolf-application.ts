import { $t } from "@/plugins/i18n";
import { wolf } from "@/router/enums";

const Layout = () => import("@/layout/index.vue");

// 应用管理
export default {
  path: "/application",
  name: "Application",
  component: Layout,
  redirect: "/application/list",
  meta: {
    icon: "ep:menu",
    title: $t("menus.wolfApplication"),
    rank: wolf
  },
  children: [
    {
      path: "/application/list",
      name: "ApplicationList",
      component: () => import("@/views/application/index.vue"),
      meta: {
        title: $t("menus.wolfApplication")
        // 注意：不能设置 showLink: false，否则父菜单会因为没有可显示的子菜单而被过滤掉
      }
    }
  ]
} satisfies RouteConfigsTable;
