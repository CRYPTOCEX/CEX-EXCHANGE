"use client";

import type React from "react";
import { Link, usePathname } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import SidebarLogo from "@/components/partials/sidebar/logo";
import { useTranslations } from "next-intl";

export interface SidebarNavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  key?: string; // Translation key
  exact?: boolean; // If true, only match exact path (not startsWith)
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
  const t = useTranslations("ext");

  const isActive = (path: string, exact?: boolean) =>
    exact ? pathname === path : (pathname === path || pathname.startsWith(path + "/"));

  const toggleMenu = (menuId: string) => {
    setOpenMenus((prev) => ({
      ...prev,
      [menuId]: !prev[menuId],
    }));
  };

  // Get translated label for sidebar item
  const getLabel = (item: SidebarNavItem): string => {
    if (!item.key) {
      return item.label;
    }
    try {
      const translated = t(item.key as any);
      // If translation exists and is not the key itself, use it
      return translated && translated !== item.key ? translated : item.label;
    } catch {
      return item.label;
    }
  };

  // Auto-open menus if a child route is active
  useEffect(() => {
    const newOpenMenus: Record<string, boolean> = {};
    navItems.forEach((item) => {
      if (
        item.children &&
        item.children.some((child) => isActive(child.href, child.exact))
      ) {
        newOpenMenus[item.href] = true;
      }
    });
    setOpenMenus((prev) => ({ ...prev, ...newOpenMenus }));
  }, [pathname, navItems]);

  const renderNavItems = (items: SidebarNavItem[]) =>
    items.map((item) => {
      const label = getLabel(item);
      if (item.children) {
        const isOpen = openMenus[item.href];
        return (
          <div key={item.href} className="space-y-1">
            <button
              onClick={() => toggleMenu(item.href)}
              className={cn(
                "flex w-full items-center justify-between gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive(item.href, item.exact)
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon className="h-5 w-5" />
                {label}
              </div>
              {isOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
            {isOpen && (
              <div className="pl-8 space-y-1">
                {item.children.map((child) => {
                  const childLabel = getLabel(child);
                  return (
                    <Link
                      key={child.href}
                      href={child.href as any}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                        isActive(child.href, child.exact)
                          ? "bg-primary/10 text-primary dark:bg-primary dark:text-black"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent"
                      )}
                      onClick={closeSidebar}
                    >
                      <child.icon className="h-5 w-5" />
                      {childLabel}
                    </Link>
                  );
                })}
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
              isActive(item.href, item.exact)
                ? "bg-primary text-primary-foreground dark:bg-primary dark:text-black"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
            onClick={closeSidebar}
          >
            <item.icon className="h-5 w-5" />
            {label}
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
