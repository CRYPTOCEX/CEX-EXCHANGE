"use client";

import { ExtNavbar, NavItem } from "@/app/[locale]/(ext)/navbar";
import {
  LayoutDashboard,
  Repeat,
  Tag,
  Shield,
  Settings,
  CreditCard,
} from "lucide-react";

const adminNavItems: NavItem[] = [
  {
    title: "Overview",
    href: "/admin/p2p",
    icon: LayoutDashboard,
    exact: true,
  },
  { title: "Trades", href: "/admin/p2p/trade", icon: Repeat },
  { title: "Offers", href: "/admin/p2p/offer", icon: Tag },
  { title: "Disputes", href: "/admin/p2p/dispute", icon: Shield },
  { title: "Payment Methods", href: "/admin/p2p/payment-method", icon: CreditCard },
  { title: "Settings", href: "/admin/p2p/settings", icon: Settings },
];

export default function P2PAdminNavbar() {
  return (
    <ExtNavbar
      navItems={adminNavItems}
      isAdmin={true}
    />
  );
} 