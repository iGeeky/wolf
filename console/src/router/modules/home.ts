import { $t } from "@/plugins/i18n";
import { home } from "@/router/enums";
const { VITE_HIDE_HOME } = import.meta.env;
const Layout = () => import("@/layout/index.vue");

export default {
  path: "/",
  name: "Home",
  component: Layout,
  redirect: "/welcome",
  meta: {
    icon: "ep/home-filled",
    title: $t("menus.pureHome"),
    rank: home
  },
  children: [
    {
      path: "/welcome",
      name: "Welcome",
      // Wolf: 使用空白页面作为首页
      component: () => import("@/views/empty/index.vue"),
      meta: {
        title: $t("menus.pureHome"),
        showLink: VITE_HIDE_HOME === "true" ? false : true
      }
    }
  ]
} satisfies RouteConfigsTable;
