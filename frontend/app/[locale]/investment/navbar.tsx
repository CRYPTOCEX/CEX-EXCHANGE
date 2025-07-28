"use client";

import SiteHeader from "@/components/partials/header/site-header";

const investmentMenu: MenuItem[] = [
  {
    key: "home",
    title: "Home",
    href: "/investment",
    icon: "lucide:home",
  },
  {
    key: "investment-plans",
    title: "Investment Plans",
    href: "/investment/plan",
    icon: "lucide:trending-up",
  },
  {
    key: "dashboard",
    title: "Dashboard",
    href: "/investment/dashboard",
    icon: "lucide:layout-dashboard",
  },
];

export default function InvestmentNavbar() {
  return <SiteHeader menu={investmentMenu} />;
}
