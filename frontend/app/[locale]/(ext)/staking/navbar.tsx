// components/staking-navbar.tsx
"use client";

import SiteHeader from "@/components/partials/header/site-header";

const stakingMenu: MenuItem[] = [
  {
    key: "dashboard",
    title: "Dashboard",
    href: "/staking",
    icon: "lucide:layout-dashboard",
  },
  {
    key: "staking-pools",
    title: "Staking Pools",
    href: "/staking/pool",
    icon: "lucide:coins",
  },
  {
    key: "my-positions",
    title: "My Positions",
    href: "/staking/position",
    icon: "lucide:wallet",
  },
  {
    key: "staking-guide",
    title: "Staking Guide",
    href: "/staking/guide",
    icon: "lucide:book-open",
  },
];

export default function StakingNavbar() {
  return <SiteHeader menu={stakingMenu} />;
}
