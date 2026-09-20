"use client";

import React, { useState, useEffect, useMemo } from "react";
import { m, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { createIsItemActive } from "@/lib/menu-active";
import { Link, usePathname } from "@/i18n/routing";
import { useSidebar } from "@/store";
import { useUserStore } from "@/store/user";
import { useConfigStore } from "@/store/config";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icon";
import {
  X,
  ChevronRight,
  ChevronDown,
  Search,
  Home,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Moon,
  Sun,
  User as UserIcon,
  Settings as SettingsIcon,
  Globe,
  Bell,
} from "lucide-react";
import NavbarLogo from "@/components/elements/navbar-logo";
import LanguageSelector from "./language-selector";
import { NotificationBell } from "./notification-bell";

interface MobileMenuProps {
  menuItems: MenuItem[];
  getTitle: (item: MenuItem) => string;
  onOpenCommandPalette: () => void;
  userPath?: string;
}

export default function MobileMenu({
  menuItems,
  getTitle,
  onOpenCommandPalette,
  userPath = "/",
}: MobileMenuProps) {
  const { mobileMenu, setMobileMenu } = useSidebar();
  const pathname = usePathname();
  const { hasPermission } = useUserStore();
  const { settings } = useConfigStore();
  const t = useTranslations("common");
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [mounted, setMounted] = useState(false);

  const layoutSwitcherEnabled =
    settings?.layoutSwitcher === true || settings?.layoutSwitcher === "true";
  const isInAdminArea = pathname.startsWith("/admin");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close menu on route change
  useEffect(() => {
    setMobileMenu(false);
  }, [pathname, setMobileMenu]);

  // Toggle expanded item
  const toggleExpanded = (key: string) => {
    setExpandedItems((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  // Resolved once for the whole drawer: only the most specific href matches, so
  // a parent page and its own sub-page can never both render as active. Leaf
  // rows used to compare with `pathname === child.href`, which meant a deeper
  // page (a record under a list, say) highlighted nothing at all.
  const isActiveItem = useMemo(
    () => createIsItemActive(pathname, menuItems),
    [pathname, menuItems]
  );

  // Filter items based on search
  const filteredItems = searchQuery
    ? menuItems.filter((item) => {
        const searchLower = searchQuery.toLowerCase();
        const matchesTitle = getTitle(item).toLowerCase().includes(searchLower);
        const matchesChild = item.child?.some((c) =>
          getTitle(c).toLowerCase().includes(searchLower)
        );
        const matchesMega = item.megaMenu?.some(
          (m) =>
            getTitle(m).toLowerCase().includes(searchLower) ||
            m.child?.some((c) =>
              getTitle(c).toLowerCase().includes(searchLower)
            )
        );
        return matchesTitle || matchesChild || matchesMega;
      })
    : menuItems;

  return (
    <AnimatePresence>
      {mobileMenu && (
        <>
          {/* Backdrop */}
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileMenu(false)}
            className={cn(
              "fixed inset-0 z-[var(--z-scrim)]",
              "bg-overlay/70",
              "backdrop-blur-sm"
            )}
          />

          {/* Sidebar */}
          <m.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={cn(
              "fixed top-0 left-0 bottom-0 z-[var(--z-drawer)] w-[300px] flex flex-col",
              "border-r shadow-2xl",
              "bg-popover border-border"
            )}
          >
            {/* Header */}
            <div
              className={cn(
                "flex items-center justify-between px-4 h-16 border-b flex-shrink-0",
                "border-border"
              )}
            >
              <NavbarLogo href="/" isInAdmin={false} alwaysShowName={true} />
              <button
                onClick={() => setMobileMenu(false)}
                className={cn(
                  "p-2 rounded-lg transition-colors cursor-pointer",
                  "hover:bg-muted text-muted-foreground"
                )}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search */}
            <div className="px-4 py-3 flex-shrink-0">
              <button
                onClick={() => {
                  setMobileMenu(false);
                  setTimeout(onOpenCommandPalette, 300);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors cursor-pointer",
                  "border",
                  "bg-surface-2 border-border text-muted-foreground hover:border-border-strong"
                )}
              >
                <Search className="w-4 h-4" />
                <span className="flex-1 text-left">{t("search")}…</span>
                <kbd
                  className={cn(
                    "px-1.5 py-0.5 rounded text-[10px] font-medium",
                    "bg-muted text-subtle-foreground"
                  )}
                >
                  ⌘K
                </kbd>
              </button>
            </div>

            {/* Menu Items */}
            <div className="flex-1 overflow-y-auto px-3 py-2">
              <nav className="space-y-1">
                {filteredItems.map((item) => (
                  <MobileMenuItem
                    key={item.key}
                    item={item}
                    getTitle={getTitle}
                    isActive={isActiveItem(item)}
                    isItemActive={isActiveItem}
                    isExpanded={expandedItems.includes(item.key)}
                    onToggle={() => toggleExpanded(item.key)}
                    onClose={() => setMobileMenu(false)}
                    level={0}
                  />
                ))}
              </nav>
            </div>

            {/* Footer - User/Admin Toggle */}
            {hasPermission("access.admin") && (
              <div
                className={cn(
                  "px-4 py-3 border-t flex-shrink-0",
                  "border-border"
                )}
              >
                <Link href={userPath} onClick={() => setMobileMenu(false)}>
                  <div
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors cursor-pointer",
                      "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    {isInAdminArea ? (
                      <>
                        <UserIcon className="w-4 h-4" />
                        <span>{t("user")}</span>
                      </>
                    ) : (
                      <>
                        <SettingsIcon className="w-4 h-4" />
                        <span>{t("admin")}</span>
                      </>
                    )}
                    <ArrowRight className="w-4 h-4 ml-auto" />
                  </div>
                </Link>
              </div>
            )}
          </m.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Mobile Menu Item Component
interface MobileMenuItemProps {
  item: MenuItem;
  getTitle: (item: MenuItem) => string;
  isActive: boolean;
  /** Shared "most specific href wins" predicate — see lib/menu-active.ts. */
  isItemActive: (item: MenuItem) => boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onClose: () => void;
  level: number;
}

function MobileMenuItem({
  item,
  getTitle,
  isActive,
  isItemActive,
  isExpanded,
  onToggle,
  onClose,
  level,
}: MobileMenuItemProps) {
  const hasChildren =
    (item.child && item.child.length > 0) ||
    (item.megaMenu && item.megaMenu.length > 0);
  const children = item.megaMenu || item.child;
  const isDisabled = item.disabled;

  // Ancestor highlighting is a separate question from "which row is the current
  // page": a branch stays lit whenever the active row is anywhere beneath it.
  const hasDescendantActive = (list: MenuItem[] | undefined): boolean => {
    if (!list) return false;
    return list.some(
      (child) =>
        isItemActive(child) ||
        hasDescendantActive(child.child) ||
        hasDescendantActive(child.megaMenu)
    );
  };

  const hasActiveChild = hasDescendantActive(children);

  // Auto-expand if has active child
  const [localExpanded, setLocalExpanded] = useState(hasActiveChild);

  useEffect(() => {
    if (hasActiveChild) {
      setLocalExpanded(true);
    }
  }, [hasActiveChild]);

  const handleToggle = () => {
    setLocalExpanded((prev) => !prev);
    onToggle();
  };

  const content = (
    <m.div
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all group cursor-pointer",
        isDisabled
          ? "opacity-50 cursor-not-allowed"
          : isActive || hasActiveChild
            ? "bg-primary/10 text-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-muted",
        level > 0 && "ml-4"
      )}
      style={{ paddingLeft: `${12 + level * 12}px` }}
    >
      {/* Icon */}
      {item.icon && (
        <Icon
          icon={item.icon}
          className={cn(
            "w-4 h-4 flex-shrink-0 transition-colors",
            isActive || hasActiveChild ? "text-primary" : ""
          )}
        />
      )}

      {/* Title */}
      <span className="flex-1 font-medium truncate">{getTitle(item)}</span>

      {/* Expand/Collapse Icon */}
      {hasChildren && (
        <m.div
          animate={{ rotate: localExpanded ? 90 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronRight
            className={cn(
              "w-4 h-4 flex-shrink-0",
              "text-subtle-foreground"
            )}
          />
        </m.div>
      )}
    </m.div>
  );

  return (
    <div>
      {hasChildren ? (
        <button
          onClick={handleToggle}
          disabled={isDisabled}
          className="w-full text-left"
        >
          {content}
        </button>
      ) : (
        <Link
          href={isDisabled ? "#" : item.href || "#"}
          onClick={(e) => {
            if (isDisabled) {
              e.preventDefault();
              return;
            }
            onClose();
          }}
        >
          {content}
        </Link>
      )}

      {/* Children */}
      <AnimatePresence>
        {hasChildren && localExpanded && (
          <m.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div
              className={cn(
                "mt-1 space-y-0.5",
                level === 0 && "border-l-2 ml-5",
                "border-border"
              )}
            >
              {children?.map((child) => {
                // Handle mega menu categories
                if (child.child && child.child.length > 0 && !child.href) {
                  return (
                    <div key={child.key} className="mt-2 first:mt-0">
                      <div
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider",
                          "text-subtle-foreground"
                        )}
                        style={{ paddingLeft: `${24 + level * 12}px` }}
                      >
                        {child.icon && (
                          <Icon icon={child.icon} className="w-3 h-3" />
                        )}
                        {getTitle(child)}
                      </div>
                      <div className="space-y-0.5">
                        {child.child.map((nested) => (
                          <MobileMenuItem
                            key={nested.key}
                            item={nested}
                            getTitle={getTitle}
                            isActive={isItemActive(nested)}
                            isItemActive={isItemActive}
                            isExpanded={false}
                            onToggle={() => {}}
                            onClose={onClose}
                            level={level + 2}
                          />
                        ))}
                      </div>
                    </div>
                  );
                }

                return (
                  <MobileMenuItem
                    key={child.key}
                    item={child}
                    getTitle={getTitle}
                    isActive={isItemActive(child)}
                    isItemActive={isItemActive}
                    isExpanded={false}
                    onToggle={() => {}}
                    onClose={onClose}
                    level={level + 1}
                  />
                );
              })}
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
