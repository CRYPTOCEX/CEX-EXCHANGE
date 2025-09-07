"use client";

import { ExtNavbar, NavItem } from "@/app/[locale]/(ext)/navbar";
// Pick icons that best match your UI from lucide-react
import {
  ClipboardList,
  Rocket,
  Clock,
  BarChart3,
  Activity,
  ArrowDownCircle,
  ArrowUpCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";

const navItems: NavItem[] = [
  { title: "Accounts", href: "/admin/forex/account", icon: ClipboardList },
  { title: "Plans", href: "/admin/forex/plan", icon: Rocket },
  { title: "Durations", href: "/admin/forex/duration", icon: Clock },
  { title: "Investments", href: "/admin/forex/investment", icon: BarChart3 },
  { title: "Signals", href: "/admin/forex/signal", icon: Activity },
  { title: "Deposit", href: "/admin/forex/deposit", icon: ArrowDownCircle },
  { title: "Withdraw", href: "/admin/forex/withdraw", icon: ArrowUpCircle },
];

export default function ForexNavbar() {
  const t = useTranslations("ext");
  return (
    <ExtNavbar
      navItems={navItems}
      isAdmin={true}
    />
  );
}
