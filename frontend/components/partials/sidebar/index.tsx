"use client";
import React, { useEffect } from "react";
import { cn } from "@/lib/utils";
import { useSidebar, useThemeStore } from "@/store";
import { useUserStore } from "@/store/user";
import { usePathname } from "@/i18n/routing";
import { getMenu } from "@/config/menu";
import SidebarLogo from "./logo";
import { ScrollArea } from "@/components/ui/scroll-area";
import SidebarMenu from "./menu";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useSettings } from "@/hooks/use-settings";
import { motion, AnimatePresence } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { NotificationBell } from "../header/notification-bell";
import LanguageSelector from "../header/language-selector";
import { Button } from "@/components/ui/button";

const defaultTheme = process.env.NEXT_PUBLIC_DEFAULT_THEME || "dark";

const MobileSidebar = ({ className, menu = "user" }: { className?: string; menu?: "user" | "admin" | any[] }) => {
  const { mobileMenu, setMobileMenu } = useSidebar();
  const { collapsed } = useSidebar();
  const { isRtl } = useThemeStore();
  const { user } = useUserStore();
  const pathname = usePathname();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { settings, extensions, settingsFetched } = useSettings();
  const isDesktop = useMediaQuery("(min-width: 1280px)");
  const isDark = resolvedTheme === "dark";

  // Check if layout switcher is enabled (handle both string and boolean values)
  const layoutSwitcherEnabled = settings?.layoutSwitcher === true || settings?.layoutSwitcher === "true";

  // Set default theme if layout switcher is disabled
  useEffect(() => {
    if (!layoutSwitcherEnabled && theme !== defaultTheme) {
      setTheme(defaultTheme);
    }
  }, [layoutSwitcherEnabled, theme, setTheme]);

  // Normalize menu items - same as MainMenu
  const normalizeMenuItems = (menuItems: any[]) =>
    menuItems.map((item) => ({
      ...item,
      permission:
        item.permission !== undefined
          ? Array.isArray(item.permission)
            ? item.permission
            : [item.permission]
          : undefined,
      href: typeof item.href === "string" ? item.href : "#",
      child: item.child ? normalizeMenuItems(item.child) : item.child,
      megaMenu: item.megaMenu
        ? normalizeMenuItems(item.megaMenu)
        : item.megaMenu,
    }));

  // Process menu items to flatten mega menus for sidebar display
  const processSideMenu = (normalizedMenu: any[]) => {
    if (!normalizedMenu) return [];
    return normalizedMenu.map((item) => {
      if (item.megaMenu && item.megaMenu.length > 0) {
        const combinedChild: any[] = [];
        for (const mm of item.megaMenu) {
          if (mm.child && mm.child.length > 0) {
            combinedChild.push(...mm.child);
          }
        }
        // Sort combinedChild alphabetically by title
        combinedChild.sort((a, b) => {
          const titleA = a.title?.toLowerCase() || "";
          const titleB = b.title?.toLowerCase() || "";
          return titleA.localeCompare(titleB);
        });

        return {
          ...item,
          child: combinedChild,
          megaMenu: undefined, // remove megaMenu once flattened
        };
      }
      return item;
    });
  };

  // Generate menu for sidebar with flattened mega menus
  const sideMenu = React.useMemo(() => {
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

    const normalizedMenu = normalizeMenuItems(raw);
    return processSideMenu(normalizedMenu);
  }, [menu, user, settings, extensions, settingsFetched]);

  // Don't render on desktop
  if (isDesktop) {
    return null;
  }

  // If settings aren't fetched yet, still show mobile menu with basic content
  if (!settingsFetched || !sideMenu || sideMenu.length === 0) {
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
              <div className="flex flex-col h-full min-h-0">
                <SidebarLogo hovered={collapsed} isMobile={true} />
                
                {/* Loading or no menu message */}
                <div className="flex-1 min-h-0 flex items-center justify-center p-4">
                  <div className="text-center text-muted-foreground">
                    {!settingsFetched ? (
                      <div className="space-y-2">
                        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
                        <p>Loading menu...</p>
                      </div>
                    ) : (
                      <p>No menu available</p>
                    )}
                  </div>
                </div>

                {/* Bottom Controls */}
                <div className="border-t border-border p-4 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <LanguageSelector variant="compact" />
                    <NotificationBell />
                    {/* Theme Toggle - only show if layout switcher is enabled */}
                    {layoutSwitcherEnabled && (
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
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

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
            <div className="flex flex-col h-full min-h-0">
              <SidebarLogo hovered={collapsed} isMobile={true} />
              <ScrollArea className="flex-1 min-h-0 sidebar-menu px-4">
                <SidebarMenu
                  sideMenu={sideMenu}
                  collapsed={false}
                  hovered={false}
                  isRtl={isRtl}
                  showLabels={true}
                />
              </ScrollArea>

              {/* Bottom Controls */}
              <div className="border-t border-border p-4 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <LanguageSelector variant="compact" />
                  <NotificationBell />
                  {/* Theme Toggle - only show if layout switcher is enabled */}
                  {layoutSwitcherEnabled && (
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
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default MobileSidebar;
