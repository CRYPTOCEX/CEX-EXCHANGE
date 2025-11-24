"use client";

import type { ReactNode } from "react";
import { useUserStore } from "@/store/user"; // Adjust to your actual store location
import SiteHeader from "@/components/partials/header/site-header";
import Footer from "@/components/partials/footer";

const baseP2PMenu = [
  {
    key: "home",
    title: "Home",
    href: "/p2p",
    icon: "lucide:home",
  },
  {
    key: "dashboard",
    title: "Dashboard",
    href: "/p2p/dashboard",
    icon: "lucide:layout-dashboard",
    auth: true, // Custom flag for filtering
  },
  {
    key: "offer",
    title: "Offers",
    href: "/p2p/offer",
    icon: "lucide:tag",
  },
  {
    key: "trade",
    title: "Trades",
    href: "/p2p/trade",
    icon: "lucide:arrow-left-right",
  },
  {
    key: "guided-matching",
    title: "Quick Match",
    href: "/p2p/guided-matching",
    icon: "lucide:compass",
  },
  {
    key: "guide",
    title: "Guide",
    href: "/p2p/guide",
    icon: "lucide:book-open",
  },
];

export default function P2PLayout({ children }: { children: ReactNode }) {
  // Replace with your actual user/auth hook/store
  const { user } = useUserStore();

  // Filter out "Dashboard" if not logged in
  const p2pMenu = baseP2PMenu.filter((item) => !item.auth || !!user);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader menu={p2pMenu} />
      <main className="flex-1 pt-14 md:pt-18" style={{ minHeight: 'calc(100vh - 112px - 120px)' }}>{children}</main>
      <Footer />
    </div>
  );
}
