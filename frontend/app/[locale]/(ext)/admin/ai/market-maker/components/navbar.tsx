"use client";

import { ExtNavbar, NavItem } from "@/app/[locale]/(ext)/navbar";
import {
  LayoutDashboard,
  Bot,
  Settings,
  BookOpen,
  BarChart3,
  Activity,
} from "lucide-react";

const adminNavItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/admin/ai/market-maker",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    title: "Markets",
    href: "/admin/ai/market-maker/market",
    icon: BarChart3,
  },
  {
    title: "Analytics",
    href: "/admin/ai/market-maker/analytics",
    icon: Activity,
  },
  {
    title: "Settings",
    href: "/admin/ai/market-maker/settings",
    icon: Settings,
  },
  {
    title: "Guide",
    href: "/admin/ai/market-maker/guide",
    icon: BookOpen,
  },
];

export default function AIMarketMakerAdminNavbar() {
  return <ExtNavbar navItems={adminNavItems} isAdmin={true} />;
}
