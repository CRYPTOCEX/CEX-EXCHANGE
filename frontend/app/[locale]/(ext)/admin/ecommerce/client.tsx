"use client";

import type React from "react";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Package,
  Tag,
  ShoppingBag,
  FileText,
  Settings,
  Users,
  Menu,
  X,
  MoreHorizontal,
  ChevronDown,
  Truck,
  DollarSign,
  Star,
  Heart,
} from "lucide-react";
import { useAdminEcommerceStore } from "@/store/ecommerce/admin-ecommerce";
import LanguageSelector from "@/components/partials/header/language";
import ThemeButton from "@/components/partials/header/theme-button";
import ProfileInfo from "@/components/partials/header/profile-info";
import { Link, usePathname } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface ClientProps {
  children: React.ReactNode;
}

export default function Client({ children }: ClientProps) {
  const t = useTranslations("ext");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const pathname = usePathname();

  const fetchCategories = useAdminEcommerceStore(
    (state) => state.fetchCategories
  );
  const fetchProducts = useAdminEcommerceStore((state) => state.fetchProducts);

  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, [fetchCategories, fetchProducts]);

  // Close mobile menu when path changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isNotificationsOpen &&
        !(event.target as Element).closest("#notifications-dropdown")
      ) {
        setIsNotificationsOpen(false);
      }
      if (
        isUserMenuOpen &&
        !(event.target as Element).closest("#user-dropdown")
      ) {
        setIsUserMenuOpen(false);
      }
      if (
        isSearchOpen &&
        !(event.target as Element).closest("#search-container")
      ) {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isNotificationsOpen, isUserMenuOpen, isSearchOpen]);

  const navItems = [
    { name: "Dashboard", href: "/admin/ecommerce", icon: LayoutDashboard, exact: true },
    { name: "Products", href: "/admin/ecommerce/product", icon: Package },
    { name: "Categories", href: "/admin/ecommerce/category", icon: Tag },
    { name: "Orders", href: "/admin/ecommerce/order", icon: ShoppingBag },
    { name: "Discounts", href: "/admin/ecommerce/discount", icon: DollarSign },
    { name: "Reviews", href: "/admin/ecommerce/review", icon: Star },
    { name: "Shipping", href: "/admin/ecommerce/shipping", icon: Truck },
    { name: "Wishlist", href: "/admin/ecommerce/wishlist", icon: Heart },
    { name: "Settings", href: "/admin/ecommerce/settings", icon: Settings },
  ];

  // Grouped navigation for dropdowns
  const navGroups = [
    {
      name: "Catalog",
      icon: Package,
      items: [
        { name: "Products", href: "/admin/ecommerce/product", icon: Package },
        { name: "Categories", href: "/admin/ecommerce/category", icon: Tag },
        { name: "Reviews", href: "/admin/ecommerce/review", icon: Star },
        { name: "Wishlist", href: "/admin/ecommerce/wishlist", icon: Heart },
      ]
    },
    {
      name: "Sales",
      icon: ShoppingBag,
      items: [
        { name: "Orders", href: "/admin/ecommerce/order", icon: ShoppingBag },
        { name: "Discounts", href: "/admin/ecommerce/discount", icon: DollarSign },
        { name: "Shipping", href: "/admin/ecommerce/shipping", icon: Truck },
      ]
    },
  ];
  
  // Check if a nav item is active
  const isActive = (item: { href: string; exact?: boolean }) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };

  // Check if a group has any active items
  const isGroupActive = (group: typeof navGroups[0]) => {
    return group.items.some(item => isActive(item));
  };

  return (
    <div className="min-h-screen">
      {/* Mobile menu overlay */}
      <div className="md:hidden">
        <div
          className={`fixed inset-0 z-50 transition-opacity ${isMobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        >
          <div className="absolute inset-0 bg-gray-800 dark:bg-black opacity-75"></div>
          <nav className="relative flex flex-col w-80 max-w-[80vw] h-full overflow-y-auto bg-white dark:bg-zinc-900 pb-12">
            <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-zinc-800">
              <Link href="/admin/ecommerce" className="flex items-center">
                <div className="flex items-center justify-center w-10 h-10 rounded-md bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <span className="ml-2 text-xl font-semibold text-gray-900 dark:text-white">
                  {t("Ecommerce")}
                </span>
              </Link>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1 rounded-md text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 px-2 py-4 space-y-1">
              {navItems.map((item) => {
                const active = isActive(item);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`${
                      active
                        ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400 border-l-4 border-indigo-600 dark:border-indigo-400"
                        : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-zinc-800 border-l-4 border-transparent"
                    } group flex items-center px-2 py-2.5 text-sm font-medium rounded-r-md transition-colors duration-150 ease-in-out`}
                  >
                    <item.icon
                      className={`${
                        active
                          ? "text-indigo-600 dark:text-indigo-400"
                          : "text-gray-500 dark:text-gray-400"
                      } mr-3 flex-shrink-0 h-5 w-5 transition-colors duration-150 ease-in-out`}
                    />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
            <div className="px-4 py-4 border-t border-gray-200 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <ProfileInfo />
                <ThemeButton />
              </div>
              <div className="mt-4">
                <Link
                  href="/ecommerce"
                  className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                >
                  {t("view_store")}
                </Link>
              </div>
            </div>
          </nav>
        </div>
      </div>

      {/* Top navigation */}
      <header className="sticky top-0 z-40 bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left side - Logo and Navigation */}
            <div className="flex items-center">
              {/* Mobile menu button */}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden p-2 rounded-md text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 mr-2"
              >
                <Menu className="w-6 h-6" />
              </button>

              {/* Logo */}
              <Link href="/">
                <div className="flex items-center gap-2 font-bold text-xl">
                  <span className="font-bold">{t("Ecommerce")}</span>
                  <span className="text-blue-600">{t("Admin")}</span>
                </div>
              </Link>

              {/* Desktop Navigation - With grouped dropdowns */}
              <nav className="hidden md:flex md:ml-8 md:items-center md:space-x-2">
                {/* Dashboard link - always visible */}
                <Link
                  href="/admin/ecommerce"
                  className={`${
                    pathname === "/admin/ecommerce"
                      ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                      : "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800"
                  } px-3 py-2 rounded-md text-sm font-medium flex items-center transition-colors duration-150 ease-in-out`}
                >
                  <LayoutDashboard className="h-4 w-4 mr-1.5" />
                  Dashboard
                </Link>

                {/* Catalog Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`${
                        isGroupActive(navGroups[0])
                          ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                          : "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800"
                      } h-auto px-3 py-2`}
                    >
                      <Package className="h-4 w-4 mr-1.5" />
                      Catalog
                      <ChevronDown className="h-3 w-3 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">
                      Manage Products & Categories
                    </div>
                    {navGroups[0].items.map((item) => {
                      const active = isActive(item);
                      return (
                        <DropdownMenuItem key={item.name} asChild>
                          <Link
                            href={item.href}
                            className={`flex items-center ${
                              active ? "bg-indigo-100 dark:bg-indigo-900/20" : ""
                            }`}
                          >
                            <item.icon className="h-4 w-4 mr-2" />
                            <div>
                              <div className="font-medium">{item.name}</div>
                              {item.name === "Products" && (
                                <div className="text-xs text-gray-500">Manage inventory</div>
                              )}
                              {item.name === "Categories" && (
                                <div className="text-xs text-gray-500">Organize products</div>
                              )}
                              {item.name === "Reviews" && (
                                <div className="text-xs text-gray-500">Customer feedback</div>
                              )}
                              {item.name === "Wishlist" && (
                                <div className="text-xs text-gray-500">Saved items</div>
                              )}
                            </div>
                          </Link>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Sales Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`${
                        isGroupActive(navGroups[1])
                          ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                          : "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800"
                      } h-auto px-3 py-2`}
                    >
                      <ShoppingBag className="h-4 w-4 mr-1.5" />
                      Sales
                      <ChevronDown className="h-3 w-3 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">
                      Orders & Promotions
                    </div>
                    {navGroups[1].items.map((item) => {
                      const active = isActive(item);
                      return (
                        <DropdownMenuItem key={item.name} asChild>
                          <Link
                            href={item.href}
                            className={`flex items-center ${
                              active ? "bg-indigo-100 dark:bg-indigo-900/20" : ""
                            }`}
                          >
                            <item.icon className="h-4 w-4 mr-2" />
                            <div>
                              <div className="font-medium">{item.name}</div>
                              {item.name === "Orders" && (
                                <div className="text-xs text-gray-500">Process & track</div>
                              )}
                              {item.name === "Discounts" && (
                                <div className="text-xs text-gray-500">Coupons & offers</div>
                              )}
                              {item.name === "Shipping" && (
                                <div className="text-xs text-gray-500">Delivery options</div>
                              )}
                            </div>
                          </Link>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Settings link - always visible */}
                <Link
                  href="/admin/ecommerce/settings"
                  className={`${
                    isActive({ href: "/admin/ecommerce/settings" })
                      ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                      : "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800"
                  } px-3 py-2 rounded-md text-sm font-medium flex items-center transition-colors duration-150 ease-in-out`}
                >
                  <Settings className="h-4 w-4 mr-1.5" />
                  Settings
                </Link>
              </nav>
            </div>

            {/* Right side - Search, Actions, Notifications, User */}
            <div className="flex items-center space-x-3">
              {/* View Store Link */}
              <Link
                href="/ecommerce"
                className="hidden md:inline-flex items-center px-3 py-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 rounded-md hover:bg-indigo-100 dark:hover:bg-indigo-900/30"
              >
                {t("view_store")}
              </Link>

              <LanguageSelector />
              <ThemeButton />
              <ProfileInfo />
            </div>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1">
        <div className="py-6">
          <div className="px-4 sm:px-6 lg:px-8">{children}</div>
        </div>
      </main>
    </div>
  );
}
