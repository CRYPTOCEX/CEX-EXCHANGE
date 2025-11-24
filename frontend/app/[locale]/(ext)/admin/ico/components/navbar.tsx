// components/partials/header/ico-admin-menu.tsx

"use client";
import SiteHeader from "@/components/partials/header/site-header";

const menuItems = [
  {
    key: "dashboard",
    title: "Dashboard",
    href: "/admin/ico",
    icon: "lucide:layout-dashboard",
  },
  {
    key: "offer",
    title: "Offers",
    href: "/admin/ico/offer",
    icon: "lucide:tag",
  },
  {
    key: "transaction",
    title: "Transactions",
    href: "/admin/ico/transaction",
    icon: "lucide:arrow-left-right",
  },
  {
    key: "settings",
    title: "Settings",
    href: "/admin/ico/settings",
    icon: "lucide:settings",
  },
];

export function IcoAdminMenu() {
  return <SiteHeader title="TokenLaunch" menu={menuItems} />;
}
