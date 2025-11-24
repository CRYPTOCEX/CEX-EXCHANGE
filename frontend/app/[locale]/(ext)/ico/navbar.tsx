// components/ico-navbar.tsx
"use client";

import SiteHeader from "@/components/partials/header/site-header";

const icoNavItems: MenuItem[] = [
  {
    key: "home",
    title: "Home",
    href: "/ico",
    icon: "lucide:home",
  },
  {
    key: "offers",
    title: "Offers",
    href: "/ico/offer",
    icon: "lucide:package",
  },
  {
    key: "dashboard",
    title: "Dashboard",
    href: "/ico/dashboard",
    icon: "lucide:layout-dashboard",
  },
  {
    key: "creator",
    title: "Creator",
    icon: "lucide:users",
    child: [
      {
        key: "creator-dashboard",
        title: "Dashboard",
        href: "/ico/creator",
        icon: "lucide:layout-dashboard",
      },
      {
        key: "launch-token",
        title: "Launch Token",
        href: "/ico/creator/launch",
        icon: "lucide:rocket",
      },
      {
        key: "token-simulator",
        title: "Token Simulator",
        href: "/ico/creator/token-simulator",
        icon: "lucide:calculator",
      },
    ],
  },
  {
    key: "about",
    title: "About",
    href: "/ico/about",
    icon: "lucide:info",
  },
];

export default function IcoNavbar() {
  return <SiteHeader menu={icoNavItems} />;
}
