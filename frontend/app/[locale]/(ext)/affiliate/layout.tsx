// components/affiliate-layout.tsx
"use client";

import type { ReactNode } from "react";
import SiteHeader from "@/components/partials/header/site-header";
import Footer from "@/components/partials/footer";

const affiliateMenu: MenuItem[] = [
  {
    key: "dashboard",
    title: "Dashboard",
    href: "/affiliate/dashboard",
    icon: "lucide:layout-dashboard",
  },
  {
    key: "conditions",
    title: "Conditions",
    href: "/affiliate/condition",
    icon: "carbon:condition-point",
  },
  {
    key: "referrals",
    title: "Referrals",
    href: "/affiliate/referral",
    icon: "mdi:account-group-outline",
  },
  {
    key: "network",
    title: "Network",
    href: "/affiliate/network",
    icon: "mdi:network",
  },
  {
    key: "rewards",
    title: "Rewards",
    href: "/affiliate/reward",
    icon: "material-symbols-light:rewarded-ads-outline-rounded",
  },
];

export default function AffiliateLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      {/* Top site header menu */}
      <SiteHeader menu={affiliateMenu} />
      <div className="container mx-auto pt-14 md:pt-18">{children}</div>
      <Footer />
    </div>
  );
}
