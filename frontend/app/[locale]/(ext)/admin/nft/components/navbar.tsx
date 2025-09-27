"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import NavbarLogo from "@/components/elements/navbar-logo";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
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
  MessageSquare,
  Building2,
  BookOpen,
  ChevronDown
} from "lucide-react";

const mainNavigationItems = [
  {
    title: "Dashboard",
    href: "/admin/nft",
    icon: Home,
    description: "NFT marketplace overview"
  },
  {
    title: "Setup Guide",
    href: "/admin/nft/onboarding",
    icon: BookOpen,
    description: "Complete marketplace setup checklist"
  }
];

const navigationGroups = [
  {
    title: "Content",
    items: [
      {
        title: "Collections",
        href: "/admin/nft/collection",
        icon: Package,
        description: "Manage NFT collections"
      },
      {
        title: "NFTs",
        href: "/admin/nft/token",
        icon: Coins,
        description: "Manage individual NFTs"
      },
      {
        title: "Categories",
        href: "/admin/nft/category",
        icon: Palette,
        description: "Manage NFT categories"
      }
    ]
  },
  {
    title: "Trading",
    items: [
      {
        title: "Marketplace",
        href: "/admin/nft/marketplace",
        icon: Building2,
        description: "Deploy and manage marketplace contracts"
      },
      {
        title: "Listings",
        href: "/admin/nft/listing",
        icon: ShoppingCart,
        description: "Active marketplace listings"
      },
      {
        title: "Offers",
        href: "/admin/nft/offer",
        icon: Zap,
        description: "Manage offers and bids on NFTs"
      },
      {
        title: "Auctions",
        href: "/admin/nft/auction",
        icon: Layers,
        description: "Manage NFT auctions and contracts"
      },
      {
        title: "Sales",
        href: "/admin/nft/sale",
        icon: TrendingUp,
        description: "Completed sales transactions"
      }
    ]
  },
  {
    title: "Community",
    items: [
      {
        title: "Creators",
        href: "/admin/nft/creator",
        icon: Users,
        description: "Creator profiles and verification"
      },
      {
        title: "Activity",
        href: "/admin/nft/activity",
        icon: Activity,
        description: "Marketplace activity feed"
      }
    ]
  },
  {
    title: "System",
    items: [
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
    ]
  }
];

// Flattened list for mobile navigation
const allNavigationItems = [
  ...mainNavigationItems,
  ...navigationGroups.flatMap(group => group.items)
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
      {allNavigationItems.map((item) => {
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
          <div className="mr-6 flex items-center space-x-2">
            <NavbarLogo href="/admin/nft" isInAdmin={true} />
            <span className="hidden font-bold sm:inline-block text-blue-600">
              NFT Admin
            </span>
          </div>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            {/* Main Navigation Items */}
            {mainNavigationItems.map((item) => {
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

            {/* Grouped Navigation Items */}
            {navigationGroups.map((group) => {
              const hasActiveItem = group.items.some(item => isActive(item.href));
              
              return (
                <DropdownMenu key={group.title}>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      className={`flex items-center gap-2 px-3 py-2 h-auto font-medium text-sm transition-colors hover:text-foreground/80 ${
                        hasActiveItem ? "text-foreground bg-accent/50" : "text-foreground/60 hover:text-foreground"
                      }`}
                    >
                      {group.title}
                      <ChevronDown className={`h-3 w-3 transition-transform ${hasActiveItem ? "text-primary" : ""}`} />
                      {hasActiveItem && (
                        <div className="w-1.5 h-1.5 bg-primary rounded-full ml-1" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-64 p-2">
                    <DropdownMenuLabel className="px-2 py-1.5 text-sm font-semibold">
                      {group.title}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="my-1" />
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.href);
                      
                      return (
                        <DropdownMenuItem key={item.href} asChild className="p-0">
                          <Link
                            href={item.href}
                            className={`flex items-start gap-3 w-full px-2 py-3 rounded-md transition-colors hover:bg-accent hover:text-accent-foreground ${
                              active ? "bg-accent text-accent-foreground" : ""
                            }`}
                          >
                            <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm">{item.title}</div>
                              <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                {item.description}
                              </div>
                            </div>
                            {active && (
                              <div className="w-2 h-2 bg-primary rounded-full ml-2 flex-shrink-0" />
                            )}
                          </Link>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
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
              <div className="flex items-center space-x-2">
                <NavbarLogo href="/admin/nft" isInAdmin={true} />
                <span className="font-bold text-blue-600">NFT Admin</span>
              </div>
            </div>
            <div className="px-6">
              <NavItems />
            </div>
          </SheetContent>
        </Sheet>

        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            <div className="md:hidden flex items-center space-x-2">
              <NavbarLogo href="/admin/nft" isInAdmin={true} />
              <span className="font-bold text-blue-600">NFT Admin</span>
            </div>
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