"use client";

import type { ReactNode } from "react";

import Footer from "@/components/partials/footer";
import { usePathname } from "@/i18n/routing";
import SiteHeader from "@/components/partials/header/site-header";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const menuItems: MenuItem[] = [
    {
      key: "dashboard",
      title: "Dashboard",
      href: "/admin/affiliate",
      icon: "lucide:layout-dashboard",
    },
    {
      key: "referrals",
      title: "Referrals",
      href: "/admin/affiliate/referral",
      icon: "lucide:user-plus",
    },
    {
      key: "conditions",
      title: "Conditions",
      href: "/admin/affiliate/condition",
      icon: "lucide:bar-chart-3",
    },
    {
      key: "rewards",
      title: "Rewards",
      href: "/admin/affiliate/reward",
      icon: "lucide:trophy",
    },
    {
      key: "settings",
      title: "Settings",
      href: "/admin/affiliate/settings",
      icon: "lucide:settings",
    },
  ];

  return (
    <>
      <SiteHeader title="Affiliate" menu={menuItems} />
      <main className="flex-1 mx-auto container space-y-8 py-30">
        {children}
      </main>
      <Footer />
    </>
  );
}
