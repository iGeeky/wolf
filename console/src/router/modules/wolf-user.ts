import { $t } from "@/plugins/i18n";
import { wolf } from "@/router/enums";

const Layout = () => import("@/layout/index.vue");

// 用户管理
export default {
  path: "/user",
  name: "User",
  component: Layout,
  redirect: "/user/list",
  meta: {
    icon: "ep:user",
    title: $t("menus.wolfUser"),
    rank: wolf + 1
  },
  children: [
    {
      path: "/user/list",
      name: "UserList",
      component: () => import("@/views/user/index.vue"),
      meta: {
        title: $t("menus.wolfUser")
      }
    }
  ]
} satisfies RouteConfigsTable;

