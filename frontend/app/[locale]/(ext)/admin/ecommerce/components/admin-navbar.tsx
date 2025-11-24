"use client";

import { useState } from "react";
import {
  Menu,
  X,
  ShoppingBag,
  LayoutDashboard,
  Tag,
  Package,
  FileText,
  Settings,
} from "lucide-react";
import { Link, usePathname } from "@/i18n/routing";
import { ThemeToggle } from "@/app/[locale]/(dashboard)/admin/builder/components/theme-toggle";
import { useTranslations } from "next-intl";

export default function AdminNavbar() {
  const t = useTranslations("ext");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  const navItems = [
    { name: "Dashboard", href: "/admin/ecommerce", icon: LayoutDashboard },
    { name: "Products", href: "/admin/ecommerce/products", icon: Package },
    { name: "Categories", href: "/admin/ecommerce/categories", icon: Tag },
    { name: "Orders", href: "/admin/ecommerce/orders", icon: ShoppingBag },
    { name: "Reports", href: "/admin/ecommerce/reports", icon: FileText },
    { name: "Settings", href: "/admin/ecommerce/settings", icon: Settings },
  ];

  return (
    <nav className="bg-gray-800 dark:bg-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link
                href="/admin/ecommerce"
                className="flex items-center text-white dark:text-zinc-100"
              >
                <ShoppingBag className="h-8 w-8 mr-2 text-indigo-400" />
                <span className="font-bold text-xl">{t("Admin")}</span>
              </Link>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                {navItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`${
                      pathname === item.href
                        ? "bg-gray-900 dark:bg-zinc-900 text-white dark:text-zinc-100"
                        : "text-gray-300 dark:text-zinc-400 hover:bg-gray-700 dark:hover:bg-zinc-700 hover:text-white dark:hover:text-zinc-100"
                    } px-3 py-2 rounded-md text-sm font-medium flex items-center`}
                  >
                    <item.icon className="h-5 w-5 mr-2" />
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="ml-4 flex items-center md:ml-6">
              <ThemeToggle />
              <Link
                href="/ecommerce"
                className="text-gray-300 dark:text-zinc-400 hover:bg-gray-700 dark:hover:bg-zinc-700 hover:text-white dark:hover:text-zinc-100 px-3 py-2 rounded-md text-sm font-medium"
              >
                {t("view_store")}
              </Link>
            </div>
          </div>
          <div className="-mr-2 flex md:hidden">
            <ThemeToggle />
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="bg-gray-800 dark:bg-zinc-800 inline-flex items-center justify-center p-2 rounded-md text-gray-400 dark:text-zinc-400 hover:text-white dark:hover:text-zinc-100 hover:bg-gray-700 dark:hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 dark:focus:ring-offset-zinc-800 focus:ring-white"
            >
              <span className="sr-only">Open main menu</span>
              {isMenuOpen ? (
                <X className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`${
                  pathname === item.href
                    ? "bg-gray-900 dark:bg-zinc-900 text-white dark:text-zinc-100"
                    : "text-gray-300 dark:text-zinc-400 hover:bg-gray-700 dark:hover:bg-zinc-700 hover:text-white dark:hover:text-zinc-100"
                } block px-3 py-2 rounded-md text-base font-medium flex items-center`}
                onClick={() => setIsMenuOpen(false)}
              >
                <item.icon className="h-5 w-5 mr-2" />
                {item.name}
              </Link>
            ))}
            <Link
              href="/ecommerce"
              className="text-gray-300 dark:text-zinc-400 hover:bg-gray-700 dark:hover:bg-zinc-700 hover:text-white dark:hover:text-zinc-100 block px-3 py-2 rounded-md text-base font-medium"
              onClick={() => setIsMenuOpen(false)}
            >
              {t("view_store")}
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
