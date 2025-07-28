// components/forex-navbar.tsx
"use client";

import SiteHeader from "@/components/partials/header/site-header";

interface MenuItem {
  key: string;
  title: string;
  href: string;
  icon: string;
}

const forexMenu: MenuItem[] = [
  {
    key: "home",
    title: "Home",
    href: "/forex",
    icon: "lucide:home",
  },
  {
    key: "investment-plans",
    title: "Investment Plans",
    href: "/forex/plan",
    icon: "lucide:calculator",
  },
  {
    key: "dashboard",
    title: "Dashboard",
    href: "/forex/dashboard",
    icon: "lucide:layout-dashboard",
  },
  {
    key: "transactions",
    title: "Transactions",
    href: "/forex/transactions",
    icon: "lucide:receipt",
  },
];

export default function ForexNavbar() {
  return <SiteHeader menu={forexMenu} />;
}
