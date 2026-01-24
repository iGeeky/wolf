import { $t } from "@/plugins/i18n";
import { wolf } from "@/router/enums";

const Layout = () => import("@/layout/index.vue");

// 角色管理
export default {
  path: "/role",
  name: "Role",
  component: Layout,
  redirect: "/role/list",
  meta: {
    icon: "ep:avatar",
    title: $t("menus.wolfRole"),
    rank: wolf + 2
  },
  children: [
    {
      path: "/role/list",
      name: "RoleList",
      component: () => import("@/views/role/index.vue"),
      meta: {
        title: $t("menus.wolfRole")
      }
    }
  ]
} satisfies RouteConfigsTable;

