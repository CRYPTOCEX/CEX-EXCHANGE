"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { 
  Menu, 
  Home, 
  Package, 
  Coins, 
  ShoppingCart, 
  Activity, 
  BarChart3, 
  Settings,
  Layers,
  Zap,
  TrendingUp,
  Users,
  Shield,
  Palette,
  MessageSquare
} from "lucide-react";

const navigationItems = [
  {
    title: "Dashboard",
    href: "/admin/nft",
    icon: Home,
    description: "NFT marketplace overview"
  },
  {
    title: "Collections",
    href: "/admin/nft/collection",
    icon: Package,
    description: "Manage NFT collections"
  },
  {
    title: "Tokens",
    href: "/admin/nft/token",
    icon: Coins,
    description: "Manage individual NFTs"
  },
  {
    title: "Listings",
    href: "/admin/nft/listing",
    icon: ShoppingCart,
    description: "Active marketplace listings"
  },
  {
    title: "Sales",
    href: "/admin/nft/sale",
    icon: TrendingUp,
    description: "Completed sales transactions"
  },
  {
    title: "Activity",
    href: "/admin/nft/activity",
    icon: Activity,
    description: "Marketplace activity feed"
  },
  {
    title: "Reviews",
    href: "/admin/nft/review",
    icon: MessageSquare,
    description: "NFT reviews and ratings"
  },
  {
    title: "Categories",
    href: "/admin/nft/category",
    icon: Palette,
    description: "Manage NFT categories"
  },
  {
    title: "Creators",
    href: "/admin/nft/creator",
    icon: Users,
    description: "Creator profiles and verification"
  },
  {
    title: "Analytics",
    href: "/admin/nft/analytics",
    icon: BarChart3,
    description: "Marketplace analytics and insights"
  },
  {
    title: "Settings",
    href: "/admin/nft/settings",
    icon: Settings,
    description: "Marketplace configuration"
  }
];

export default function NFTAdminNavbar() {
  const t = useTranslations();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/admin/nft") {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const NavItems = () => (
    <div className="space-y-2">
      {navigationItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);
        
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
            onClick={() => setIsOpen(false)}
          >
            <Icon className="h-4 w-4" />
            {item.title}
            {active && <Badge variant="secondary" className="ml-auto">Active</Badge>}
          </Link>
        );
      })}
    </div>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="mr-4 hidden md:flex">
          <Link href="/admin/nft" className="mr-6 flex items-center space-x-2">
            <Shield className="h-6 w-6" />
            <span className="hidden font-bold sm:inline-block">
              NFT Admin
            </span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            {navigationItems.slice(0, 6).map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 transition-colors hover:text-foreground/80 ${
                    active ? "text-foreground" : "text-foreground/60"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.title}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Mobile Navigation */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              className="mr-2 px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 md:hidden"
            >
              <Menu className="h-6 w-6" />
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="pr-0">
            <div className="px-6 py-6">
              <Link
                href="/admin/nft"
                className="flex items-center space-x-2"
                onClick={() => setIsOpen(false)}
              >
                <Shield className="h-6 w-6" />
                <span className="font-bold">NFT Admin</span>
              </Link>
            </div>
            <div className="px-6">
              <NavItems />
            </div>
          </SheetContent>
        </Sheet>

        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            <Link href="/admin/nft" className="md:hidden">
              <span className="font-bold">NFT Admin</span>
            </Link>
          </div>
          
          <nav className="flex items-center gap-2">
              <Link href="/nft">
              <Button variant="outline" size="sm">
                <Zap className="h-4 w-4 mr-2" />
                View Marketplace
              </Button>
              </Link>
              <Link href="/admin">
              <Button variant="outline" size="sm">
                <Home className="h-4 w-4 mr-2" />
                Main Admin
              </Button>
              </Link>
          </nav>
        </div>
      </div>
    </header>
  );
} 