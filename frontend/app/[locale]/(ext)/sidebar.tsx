"use client";

import type React from "react";
import { Link, usePathname } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import SidebarLogo from "@/components/partials/sidebar/logo";

export interface SidebarNavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  children?: SidebarNavItem[];
}

export interface ExtSidebarProps {
  navItems: SidebarNavItem[];
  closeSidebar?: () => void;
}

export function ExtSidebar({
  navItems,
  closeSidebar,
}: ExtSidebarProps) {
  const pathname = usePathname();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  const isActive = (path: string) =>
    pathname === path || pathname.startsWith(path);

  const toggleMenu = (menuId: string) => {
    setOpenMenus((prev) => ({
      ...prev,
      [menuId]: !prev[menuId],
    }));
  };

  // Auto-open menus if a child route is active
  useEffect(() => {
    const newOpenMenus: Record<string, boolean> = {};
    navItems.forEach((item) => {
      if (
        item.children &&
        item.children.some((child) => isActive(child.href))
      ) {
        newOpenMenus[item.href] = true;
      }
    });
    setOpenMenus((prev) => ({ ...prev, ...newOpenMenus }));
  }, [pathname, navItems]);

  const renderNavItems = (items: SidebarNavItem[]) =>
    items.map((item) => {
      if (item.children) {
        const isOpen = openMenus[item.href];
        return (
          <div key={item.href} className="space-y-1">
            <button
              onClick={() => toggleMenu(item.href)}
              className={cn(
                "flex w-full items-center justify-between gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive(item.href)
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon className="h-5 w-5" />
                {item.label}
              </div>
              {isOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
            {isOpen && (
              <div className="pl-8 space-y-1">
                {item.children.map((child) => (
                  <Link
                    key={child.href}
                    href={child.href as any}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      isActive(child.href)
                        ? "bg-primary/10 text-primary dark:bg-primary dark:text-black"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                    onClick={closeSidebar}
                  >
                    <child.icon className="h-5 w-5" />
                    {child.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      } else {
        return (
          <Link
            key={item.href}
            href={item.href as any}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
              isActive(item.href)
                ? "bg-primary text-primary-foreground dark:bg-primary dark:text-black"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
            onClick={closeSidebar}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        );
      }
    });

  return (
    <div className="flex flex-col h-full min-h-0 bg-background">
      <div className="border-b flex-shrink-0">
        <SidebarLogo />
      </div>
      <div className="flex-1 min-h-0 py-6 px-4 space-y-1 overflow-y-auto">
        {renderNavItems(navItems)}
      </div>
    </div>
  );
}
