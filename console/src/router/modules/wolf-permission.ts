import { $t } from "@/plugins/i18n";
import { wolf } from "@/router/enums";

const Layout = () => import("@/layout/index.vue");

// 权限管理（包含分类和权限）
export default {
  path: "/permission",
  name: "Permission",
  component: Layout,
  redirect: "/permission/category",
  meta: {
    icon: "ep:lock",
    title: $t("menus.wolfPermission"),
    rank: wolf + 3
  },
  children: [
    {
      path: "/permission/category",
      name: "Category",
      component: () => import("@/views/category/index.vue"),
      meta: {
        title: $t("menus.wolfCategory")
      }
    },
    {
      path: "/permission/list",
      name: "PermissionList",
      component: () => import("@/views/permission/index.vue"),
      meta: {
        title: $t("menus.wolfPermission")
      }
    }
  ]
} satisfies RouteConfigsTable;
