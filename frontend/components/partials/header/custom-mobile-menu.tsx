"use client";

import React, { useEffect } from "react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/store";
import { useUserStore } from "@/store/user";
import { usePathname } from "@/i18n/routing";
import { getMenu } from "@/config/menu";
import SidebarLogo from "../sidebar/logo";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useSettings } from "@/hooks/use-settings";
import { motion, AnimatePresence } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { NotificationBell } from "./notification-bell";
import LanguageSelector from "./language-selector";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { Icon } from "@iconify/react";

// MenuItem interface is defined globally in types/menu.d.ts

interface CustomMobileMenuProps {
  className?: string;
  menu?: "user" | MenuItem[];
  siteName?: string;
}

const CustomMobileMenu = ({
  className,
  menu = "user",
  siteName = "Bicrypto",
}: CustomMobileMenuProps) => {
  const { mobileMenu, setMobileMenu } = useSidebar();
  const { user } = useUserStore();
  const pathname = usePathname();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { settings, extensions, settingsFetched } = useSettings();
  const isDesktop = useMediaQuery("(min-width: 1280px)");
  const isDark = resolvedTheme === "dark";

  // Normalize menu items
  const normalizeMenuItems = (menuItems: any[]): MenuItem[] =>
    menuItems.map((item) => ({
      ...item,
      href: item.href || "#", // Use original href or fallback to "#"
      child: item.child ? normalizeMenuItems(item.child) : undefined,
    }));

  const menuItems = React.useMemo(() => {
    // Don't render menu until settings are fetched to avoid showing incomplete menu
    if (!settingsFetched) {
      return [];
    }

    let raw;
    if (typeof menu === "string") {
      raw = getMenu({
        user,
        settings,
        extensions,
        activeMenuType: menu,
      });
    } else if (Array.isArray(menu)) {
      raw = menu;
    } else {
      raw = [];
    }
    return normalizeMenuItems(raw);
  }, [menu, user, settings, extensions, settingsFetched]);

  // Don't render on desktop or if no menu
  if (isDesktop || !menuItems || menuItems.length === 0) {
    return null;
  }

  const isActiveMenu = (pathname: string, item: MenuItem): boolean => {
    if (!item.href || item.href === "#") return false;
    if (pathname === item.href) return true;
    if (item.child && item.child.length > 0) {
      if (pathname.startsWith(item.href + "/")) return true;
      return item.child.some((child) => isActiveMenu(pathname, child));
    }
    return false;
  };

  return (
    <AnimatePresence mode="wait">
      {mobileMenu && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setMobileMenu(false)}
            className="overlay bg-black/60 backdrop-filter backdrop-blur-xs fixed inset-0 z-[60]"
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            className={cn(
              "fixed top-0 bg-card h-full w-[280px] z-[61]",
              className
            )}
          >
            <div className="flex flex-col h-full">
              {/* Logo */}
              <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
                <div className="relative w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-600">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M3 13.125C3 12.5727 3.44772 12.125 4 12.125H6C6.55228 12.125 7 12.5727 7 13.125V19.125C7 19.6773 6.55228 20.125 6 20.125H4C3.44772 20.125 3 19.6773 3 19.125V13.125Z"
                      fill="white"
                    />
                    <path
                      d="M10 8.125C10 7.57272 10.4477 7.125 11 7.125H13C13.5523 7.125 14 7.57272 14 8.125V19.125C14 19.6773 13.5523 20.125 13 20.125H11C10.4477 20.125 10 19.6773 10 19.125V8.125Z"
                      fill="white"
                    />
                    <path
                      d="M17 3.125C17 2.57272 17.4477 2.125 18 2.125H20C20.5523 2.125 21 2.57272 21 3.125V19.125C21 19.6773 20.5523 20.125 20 20.125H18C17.4477 20.125 17 19.6773 17 19.125V3.125Z"
                      fill="white"
                    />
                  </svg>
                </div>
                <span className="font-bold text-xl text-foreground">
                  {siteName}
                </span>
              </div>

              {/* Menu Items */}
              <ScrollArea className="flex-1 px-4 py-4">
                <div className="space-y-2">
                  {menuItems.map((item, index) => {
                    const itemKey = item.key || `item-${index}`;
                    const active = isActiveMenu(pathname, item);

                    return (
                      <div key={itemKey}>
                        <Link
                          href={item.href || "#"}
                          onClick={() => setMobileMenu(false)}
                          className={cn(
                            "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors",
                            active
                              ? "bg-primary/10 text-primary border-l-2 border-primary"
                              : "text-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          {item.icon && (
                            <Icon
                              icon={item.icon}
                              className="h-5 w-5 shrink-0"
                            />
                          )}
                          <span>{item.title}</span>
                        </Link>

                        {/* Child menu items */}
                        {item.child && item.child.length > 0 && (
                          <div className="ml-6 mt-2 space-y-1">
                            {item.child.map((child, childIndex) => {
                              const childKey =
                                child.key || `child-${childIndex}`;
                              const childActive = isActiveMenu(pathname, child);

                              return (
                                <Link
                                  key={childKey}
                                  href={child.href || "#"}
                                  onClick={() => setMobileMenu(false)}
                                  className={cn(
                                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                                    childActive
                                      ? "bg-primary/5 text-primary"
                                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                  )}
                                >
                                  {child.icon && (
                                    <Icon
                                      icon={child.icon}
                                      className="h-4 w-4 shrink-0"
                                    />
                                  )}
                                  <span>{child.title}</span>
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>

              {/* Bottom Controls */}
              <div className="border-t border-border p-4 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <LanguageSelector variant="compact" />
                  <NotificationBell />
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "rounded-full",
                      isDark
                        ? "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                        : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
                    )}
                    onClick={() =>
                      setTheme(theme === "dark" ? "light" : "dark")
                    }
                  >
                    <AnimatePresence mode="wait">
                      {isDark ? (
                        <motion.div
                          key="sun"
                          initial={{ opacity: 0, rotate: -90 }}
                          animate={{ opacity: 1, rotate: 0 }}
                          exit={{ opacity: 0, rotate: 90 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Sun className="h-5 w-5" />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="moon"
                          initial={{ opacity: 0, rotate: 90 }}
                          animate={{ opacity: 1, rotate: 0 }}
                          exit={{ opacity: 0, rotate: -90 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Moon className="h-5 w-5" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CustomMobileMenu;
