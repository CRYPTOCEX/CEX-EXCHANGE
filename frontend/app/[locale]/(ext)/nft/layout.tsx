"use client";

import { useUserStore } from "@/store/user";
import SiteHeader from "@/components/partials/header/site-header";
import Footer from "@/components/partials/footer";

interface MenuItem {
  key: string;
  title: string;
  href?: string;
  icon?: string;
  auth?: boolean;
  child?: MenuItem[];
}

// NFT Menu Configuration
const nftMenu: MenuItem[] = [
  {
    key: "explore",
    title: "Explore",
    href: "/nft",
    icon: "lucide:compass",
  },
  {
    key: "marketplace",
    title: "Marketplace",
    href: "/nft/marketplace",
    icon: "lucide:shopping-bag",
  },
  {
    key: "create",
    title: "Create",
    href: "/nft/create",
    icon: "lucide:plus-circle",
    auth: true,
  },
  {
    key: "dashboard",
    title: "Dashboard",
    icon: "lucide:layout-dashboard",
    auth: true,
    child: [
      {
        key: "my-nfts",
        title: "My NFTs",
        href: "/nft/dashboard",
        icon: "lucide:image",
        auth: true,
      },
      {
        key: "creator-dashboard",
        title: "Creator Dashboard",
        href: "/nft/creator/dashboard",
        icon: "lucide:bar-chart-3",
        auth: true,
      },
      {
        key: "creator-profile",
        title: "Creator Profile",
        href: "/nft/creator/profile",
        icon: "lucide:user-circle",
        auth: true,
      },
    ],
  },
];

export default function NFTLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useUserStore();

  // Filter menu items based on authentication
  const filteredMenu = nftMenu.filter((item) => {
    if (item.auth && !user) return false;
    if (item.child) {
      item.child = item.child.filter((child) => {
        if (child.auth && !user) return false;
        return true;
      });
    }
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader menu={filteredMenu} />
      <main className="flex-1 pt-14 md:pt-18">{children}</main>
      <Footer />
    </div>
  );
} 