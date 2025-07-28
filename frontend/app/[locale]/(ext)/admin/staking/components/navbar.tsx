"use client";

import { ExtNavbar, NavItem } from "@/app/[locale]/(ext)/navbar";
import {
  LayoutDashboard,
  Coins,
  Wallet,
  DollarSign,
  Settings,
} from "lucide-react";

const adminNavItems: NavItem[] = [
  {
    title: "Overview",
    href: "/admin/staking",
    icon: LayoutDashboard,
    exact: true,
  },
  { title: "Pools", href: "/admin/staking/pool", icon: Coins },
  { title: "Positions", href: "/admin/staking/position", icon: Wallet },
  { title: "Earnings", href: "/admin/staking/earning", icon: DollarSign },
  { title: "Analytics", href: "/admin/staking/analytic", icon: Settings },
];

export default function AdminNavbar() {
  return (
    <ExtNavbar
      branding={{
        logo: <Settings className="h-8 w-8 text-primary" />,
        text: "Admin Panel",
      }}
      navItems={adminNavItems}
    />
  );
}
