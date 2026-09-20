"use client";
import React from "react";
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
import { m, AnimatePresence } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { NotificationBell } from "../header/notification-bell";
import LanguageSelector from "../header/language-selector";
import { Button } from "@/components/ui/button";
import { SkeletonText } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";
import { useChrome } from "@/components/chrome/chrome-provider";

const MobileSidebar = ({ className, menu = "user" }: { className?: string; menu?: "user" | "admin" | any[] }) => {
  const t = useTranslations("components");
  const { mobileMenu, setMobileMenu } = useSidebar();
  const { collapsed } = useSidebar();
  const { isRtl } = useThemeStore();
  const { user } = useUserStore();
  const pathname = usePathname();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { settings, extensions, settingsFetched } = useSettings();
  /* The admin's per-menu patches. `useChrome` is defaulted, so a subtree mounted
     outside the provider gets `{}` and the shipped menu. */
  const { menuOverrides } = useChrome();
  const isDesktop = useMediaQuery("(min-width: 1280px)");
  const isDark = resolvedTheme === "dark";

  // Check if layout switcher is enabled (handle both string and boolean values)
  const layoutSwitcherEnabled = settings?.layoutSwitcher === true || settings?.layoutSwitcher === "true";

  // Note: Theme is controlled by ThemeProvider in providers.tsx
  // When layoutSwitcher is disabled, the defaultTheme is already set in ThemeProvider
  // We don't need to force it here as it would override the user's stored preference on every mount

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
      /* The override is resolved INSIDE `getMenu`, against the permission- and
         extension-filtered tree, and therefore before `processSideMenu` folds
         each `megaMenu` into `child`. That fold destroys the level structure the
         patch's `order` and `custom` entries are keyed against, so overriding
         afterwards would silently ignore every reorder in a mega menu. */
      raw = getMenu({
        user,
        settings,
        extensions,
        activeMenuType: menu,
        menuOverrides,
      });
    } else if (Array.isArray(menu)) {
      raw = menu;
    } else {
      raw = [];
    }

    const normalizedMenu = normalizeMenuItems(raw);
    return processSideMenu(normalizedMenu);
  }, [menu, user, settings, extensions, settingsFetched, menuOverrides]);

  // Don't render on desktop
  if (isDesktop) {
    return null;
  }

  /**
   * ONE DRAWER, NOT TWO.
   * ==========================================================================
   *
   * There were two complete copies of this drawer here — 96 lines of backdrop,
   * spring transition, logo, bottom control bar and theme toggle, written out
   * twice — selected by `!settingsFetched || sideMenu.length === 0`. The only
   * difference between them was the middle: one had the `<ScrollArea>` with the
   * menu in it, the other had a 24px spinner centred in a `flex-1` box over the
   * words "Loading menu".
   *
   * That is the duplicate-tree failure the skeleton doc opens with, and it had
   * already cost something concrete: the copy dropped `<ScrollArea>` and the
   * `px-4` gutter with it, so the menu did not simply appear — it appeared 16px
   * to the left of where the placeholder had been, inside a box that had just
   * changed from centred to top-aligned.
   *
   * It also conflated two different answers. `!settingsFetched` means "we do not
   * know yet"; an empty `sideMenu` on a fetched install means "this user's menu
   * really is empty". Both rendered from the same branch, so a user with no menu
   * items saw a spinner turn into a message, and a user whose settings were slow
   * saw the same spinner mean something else.
   *
   * Now the drawer is drawn once and only its list waits.
   */
  const pendingMenu = !settingsFetched;

  return (
    <AnimatePresence mode="wait">
      {mobileMenu && (
        <>
          {/* Backdrop */}
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setMobileMenu(false)}
            className="overlay bg-overlay/60 backdrop-filter backdrop-blur-xs fixed inset-0 z-[var(--z-scrim)]"
          />

          {/* Sidebar */}
          <m.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            className={cn(
              "fixed top-0 bg-card h-full w-[280px] z-[var(--z-drawer)]",
              className
            )}
          >
            <div className="flex flex-col h-full min-h-0">
              <SidebarLogo hovered={collapsed} isMobile={true} />
              <ScrollArea className="flex-1 min-h-0 sidebar-menu px-4">
                {pendingMenu ? (
                  /* A menu has no knowable length before settings answer, so
                     this reserves the CONTAINER: six rows in the real row box —
                     `flex gap-3 px-[10px] py-3` around a 20px glyph and a
                     `text-sm` label, i.e. 44px each — rather than predicting the
                     count. See `single-menu-item.tsx`, which owns that box. */
                  <ul className="space-y-1" aria-busy="true">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <li
                        key={`pending_menu_${i}`}
                        className="flex gap-3 px-[10px] py-3 text-sm font-medium"
                      >
                        <span className="grow-0">
                          <span className="block w-5 h-5 rounded bg-muted animate-pulse" />
                        </span>
                        <div className="text-box grow">
                          <SkeletonText chars={i % 2 ? 10 : 14} />
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : sideMenu.length > 0 ? (
                  <SidebarMenu
                    sideMenu={sideMenu}
                    collapsed={false}
                    hovered={false}
                    isRtl={isRtl}
                    showLabels={true}
                  />
                ) : (
                  /* RESOLVED and empty — a real answer, not a pending one. */
                  <p className="py-6 text-center text-muted-foreground">
                    {t("no_menu_available")}
                  </p>
                )}
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
                        "text-muted-foreground hover:text-foreground hover:bg-muted"
                      )}
                      onClick={() =>
                        setTheme(theme === "dark" ? "light" : "dark")
                      }
                    >
                      <AnimatePresence mode="wait">
                        {isDark ? (
                          <m.div
                            key="sun"
                            initial={{ opacity: 0, rotate: -90 }}
                            animate={{ opacity: 1, rotate: 0 }}
                            exit={{ opacity: 0, rotate: 90 }}
                            transition={{ duration: 0.2 }}
                          >
                            <Sun className="h-5 w-5" />
                          </m.div>
                        ) : (
                          <m.div
                            key="moon"
                            initial={{ opacity: 0, rotate: 90 }}
                            animate={{ opacity: 1, rotate: 0 }}
                            exit={{ opacity: 0, rotate: -90 }}
                            transition={{ duration: 0.2 }}
                          >
                            <Moon className="h-5 w-5" />
                          </m.div>
                        )}
                      </AnimatePresence>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </m.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default MobileSidebar;
