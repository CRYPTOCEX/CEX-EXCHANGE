"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Link, usePathname } from "@/i18n/routing";
import { useSidebar } from "@/store";
import { useUserStore } from "@/store/user";
import { useConfigStore } from "@/store/config";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { Icon } from "@iconify/react";
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
  isDark: boolean;
  getTitle: (item: MenuItem) => string;
  onOpenCommandPalette: () => void;
  userPath?: string;
}

export default function MobileMenu({
  menuItems,
  isDark,
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

  // Check if item is active
  const isActiveItem = (item: MenuItem): boolean => {
    if (pathname === item.href) return true;
    // If exact is true, only match exact path
    if (item.exact) return false;
    if (item.href && pathname.startsWith(item.href + "/")) return true;
    return false;
  };

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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileMenu(false)}
            className={cn(
              "fixed inset-0 z-[60]",
              isDark ? "bg-black/80" : "bg-zinc-900/60",
              "backdrop-blur-sm"
            )}
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={cn(
              "fixed top-0 left-0 bottom-0 z-[70] w-[300px] flex flex-col",
              "border-r shadow-2xl",
              isDark
                ? "bg-zinc-950 border-zinc-800"
                : "bg-white border-zinc-200"
            )}
          >
            {/* Header */}
            <div
              className={cn(
                "flex items-center justify-between px-4 h-16 border-b flex-shrink-0",
                isDark ? "border-zinc-800" : "border-zinc-200"
              )}
            >
              <NavbarLogo href="/" isInAdmin={false} alwaysShowName={true} />
              <button
                onClick={() => setMobileMenu(false)}
                className={cn(
                  "p-2 rounded-lg transition-colors cursor-pointer",
                  isDark
                    ? "hover:bg-zinc-800 text-zinc-400"
                    : "hover:bg-zinc-100 text-zinc-500"
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
                  isDark
                    ? "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                    : "bg-zinc-50 border-zinc-200 text-zinc-500 hover:border-zinc-300"
                )}
              >
                <Search className="w-4 h-4" />
                <span className="flex-1 text-left">Search...</span>
                <kbd
                  className={cn(
                    "px-1.5 py-0.5 rounded text-[10px] font-medium",
                    isDark
                      ? "bg-zinc-800 text-zinc-500"
                      : "bg-zinc-200 text-zinc-500"
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
                    isDark={isDark}
                    getTitle={getTitle}
                    isActive={isActiveItem(item)}
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
                  isDark ? "border-zinc-800" : "border-zinc-200"
                )}
              >
                <Link href={userPath} onClick={() => setMobileMenu(false)}>
                  <div
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors cursor-pointer",
                      isDark
                        ? "text-zinc-400 hover:text-white hover:bg-zinc-800"
                        : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
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
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Mobile Menu Item Component
interface MobileMenuItemProps {
  item: MenuItem;
  isDark: boolean;
  getTitle: (item: MenuItem) => string;
  isActive: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onClose: () => void;
  level: number;
}

function MobileMenuItem({
  item,
  isDark,
  getTitle,
  isActive,
  isExpanded,
  onToggle,
  onClose,
  level,
}: MobileMenuItemProps) {
  const pathname = usePathname();
  const hasChildren =
    (item.child && item.child.length > 0) ||
    (item.megaMenu && item.megaMenu.length > 0);
  const children = item.megaMenu || item.child;
  const isDisabled = item.disabled;

  const isChildActive = (children: MenuItem[] | undefined): boolean => {
    if (!children) return false;
    return children.some((child) => {
      if (pathname === child.href) return true;
      if (child.href && pathname.startsWith(child.href + "/")) return true;
      return isChildActive(child.child) || isChildActive(child.megaMenu);
    });
  };

  const hasActiveChild = isChildActive(children);

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
    <motion.div
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all group cursor-pointer",
        isDisabled
          ? "opacity-50 cursor-not-allowed"
          : isActive || hasActiveChild
            ? isDark
              ? "bg-primary/10 text-white"
              : "bg-primary/5 text-zinc-900"
            : isDark
              ? "text-zinc-400 hover:text-white hover:bg-white/5"
              : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50",
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

      {/* Extension badge */}
      {item.extension && (
        <span
          className={cn(
            "px-1.5 py-0.5 text-[10px] font-medium rounded-md flex-shrink-0",
            isDark ? "bg-primary/20 text-primary" : "bg-primary/10 text-primary"
          )}
        >
          EXT
        </span>
      )}

      {/* Expand/Collapse Icon */}
      {hasChildren && (
        <motion.div
          animate={{ rotate: localExpanded ? 90 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronRight
            className={cn(
              "w-4 h-4 flex-shrink-0",
              isDark ? "text-zinc-600" : "text-zinc-400"
            )}
          />
        </motion.div>
      )}
    </motion.div>
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
          <motion.div
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
                isDark ? "border-zinc-800" : "border-zinc-200"
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
                          isDark ? "text-zinc-600" : "text-zinc-400"
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
                            isDark={isDark}
                            getTitle={getTitle}
                            isActive={pathname === nested.href}
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
                    isDark={isDark}
                    getTitle={getTitle}
                    isActive={pathname === child.href}
                    isExpanded={false}
                    onToggle={() => {}}
                    onClose={onClose}
                    level={level + 1}
                  />
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
