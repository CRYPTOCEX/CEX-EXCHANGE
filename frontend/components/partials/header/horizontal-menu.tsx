"use client";

import React from "react";
import * as NavigationMenu from "@radix-ui/react-navigation-menu";
import { ChevronDown } from "lucide-react";
import { Link, usePathname } from "@/i18n/routing";
import { useUserStore } from "@/store/user";
import { useConfigStore } from "@/store/config";
import { cn } from "@/lib/utils";
import { getMenu } from "@/config/menu";
import { useSettings } from "@/hooks/use-settings";
import { useMenuTranslations } from "@/components/partials/menu-translator";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import { getGradientStyle, getColorHex, NAV_COLOR_SCHEMAS } from "@/lib/nav-color-schema";

import ChildMenu from "./menu/child-menu";
import MegaMenu from "./menu/mega-menu";
import PartialMegaMenu from "./menu/partial-mega-menu";
import { Icon } from "@iconify/react";

interface MainMenuProps {
  menu: "user" | "admin" | MenuItem[];
  colorSchema?: NavColorSchema;
}

// Support both string ("user", "admin") and array (custom menu)
export default function MainMenu({ menu, colorSchema }: MainMenuProps) {
  const pathname = usePathname();
  const user = useUserStore((s) => s.user);
  const { settings, extensions, settingsFetched } = useSettings();
  const { getTitle } = useMenuTranslations();

  // Normalize menu items
  const normalizeMenuItems = (menuItems) =>
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

  const [offset, setOffset] = React.useState<number | null>(null);
  const [list, setList] = React.useState<HTMLUListElement | null | undefined>();
  const [value, setValue] = React.useState<string | null>();

  const onNodeUpdate = (
    trigger: HTMLDivElement | HTMLButtonElement | null,
    itemValue: string
  ) => {
    if (trigger && list && value === itemValue) {
      // Check if we're in RTL mode
      const isRTL = document.documentElement.dir === 'rtl';

      if (isRTL) {
        // For RTL: Calculate position from the left edge of the viewport container
        // Find the actual position of the trigger within the list
        let currentOffset = 0;
        const menuItem = trigger.closest('[data-slot="navigation-menu-item"]') as HTMLElement;

        if (menuItem) {
          // Sum up all previous siblings' widths plus gaps
          let sibling = menuItem.previousElementSibling as HTMLElement;
          while (sibling) {
            currentOffset += sibling.offsetWidth;
            sibling = sibling.previousElementSibling as HTMLElement;
          }
          // Account for gap (20px = gap-5 which is 1.25rem)
          const siblingCount = Array.from(menuItem.parentElement?.children || []).indexOf(menuItem);
          currentOffset += siblingCount * 20; // gap-5

          setOffset(Math.round(currentOffset));
        }
      } else {
        // For LTR, calculate from the left edge
        // Use the menu item's offset for accurate positioning
        const menuItem = trigger.closest('[data-slot="navigation-menu-item"]') as HTMLElement;
        if (menuItem) {
          setOffset(Math.round(menuItem.offsetLeft));
        } else {
          setOffset(Math.round(trigger.offsetLeft));
        }
      }
    } else if (value === "") {
      setOffset(null);
    }
    return trigger;
  };

  const isNestedStructure = (children) =>
    children && children.some((child) => child.child && child.child.length > 0);

  function isActiveMenu(pathname: string, item: MenuItem): boolean {
    if (!item.href || item.href === "#") return false;

    // If this is the current item
    if (pathname === item.href) return true;

    // If item has children, check for prefix match or any active child
    if (item.child && item.child.length > 0) {
      if (pathname.startsWith(item.href + "/")) return true;
      return item.child.some((child) => isActiveMenu(pathname, child));
    }

    // Also support megaMenu and nested if you use them:
    if (item.megaMenu && item.megaMenu.length > 0) {
      if (pathname.startsWith(item.href + "/")) return true;
      return item.megaMenu.some((child) => isActiveMenu(pathname, child));
    }
    if (item.nested && item.nested.length > 0) {
      if (pathname.startsWith(item.href + "/")) return true;
      return item.nested.some((child) => isActiveMenu(pathname, child));
    }

    // Only exact for leaf nodes
    return false;
  }

  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  // Get the effective color schema
  const schema = colorSchema || NAV_COLOR_SCHEMAS.default;
  const gradientStyle = getGradientStyle(schema, isDark);
  const primaryColor = getColorHex(schema.primary, isDark);
  const secondaryColor = schema.secondary ? getColorHex(schema.secondary, isDark) : primaryColor;

  if (!menuItems || menuItems.length === 0) return null;

  // Helper to get themed classes
  const getItemClasses = (active: boolean) => {
    if (colorSchema) {
      return cn(
        "flex items-center py-4 cursor-pointer group/item transition-all duration-300 relative",
        active
          ? schema.textActive
          : cn(schema.text, "hover:opacity-100")
      );
    }
    // Default styling when no color schema
    return cn(
      "flex items-center py-4 cursor-pointer group/item transition-all duration-300 relative",
      active
        ? "text-primary font-semibold"
        : "text-foreground/70 hover:text-primary"
    );
  };

  // Helper to render the active indicator
  const renderActiveIndicator = (active: boolean) => {
    if (!active) return null;

    if (colorSchema && schema.indicatorStyle === "gradient-underline") {
      return (
        <motion.div
          layoutId="nav-indicator"
          className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
          style={{ background: gradientStyle }}
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      );
    }

    if (colorSchema && schema.indicatorStyle === "glow") {
      return (
        <motion.div
          layoutId="nav-indicator"
          className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
          style={{
            background: gradientStyle,
            boxShadow: `0 0 10px ${primaryColor}80, 0 0 20px ${primaryColor}40`,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
      );
    }

    if (colorSchema && schema.indicatorStyle === "pill") {
      return (
        <motion.div
          layoutId="nav-indicator"
          className="absolute inset-0 rounded-lg -z-10"
          style={{
            background: `${primaryColor}15`,
            border: `1px solid ${primaryColor}30`,
          }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
        />
      );
    }

    // Default underline
    return (
      <motion.div
        layoutId="nav-indicator"
        className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ duration: 0.3 }}
      />
    );
  };

  // Helper to get icon color
  const getIconStyle = (active: boolean) => {
    if (!colorSchema) return {};
    return {
      color: active ? primaryColor : undefined,
      transition: "color 0.3s ease",
    };
  };

  return (
    <div>
      <NavigationMenu.Root
        onValueChange={setValue}
        delayDuration={300}
        className="flex relative justify-start group"
      >
        <NavigationMenu.List
          ref={setList}
          className="group flex list-none gap-1"
        >
          {menuItems.map((item, index) => {
            const itemKey = item.key || `item-${index}`;
            const hasChild = item.child && item.child.length > 0;
            const hasMegaMenu = item.megaMenu && item.megaMenu.length > 0;
            const isDropdown = hasChild || hasMegaMenu;
            const active = isActiveMenu(pathname, item);

            return (
              <NavigationMenu.Item key={itemKey} value={itemKey}>
                {isDropdown ? (
                  <>
                    <NavigationMenu.Trigger
                      ref={(node) => {
                        onNodeUpdate(node, itemKey);
                      }}
                      asChild
                    >
                      <div
                        className={cn(
                          getItemClasses(active),
                          "px-3 rounded-lg",
                          colorSchema && !active && schema.bgHover
                        )}
                      >
                        {item.icon && (
                          <Icon
                            icon={item.icon}
                            className={cn(
                              "h-5 w-5 ltr:mr-2 rtl:ml-2 transition-all duration-300",
                              active && colorSchema && "drop-shadow-sm"
                            )}
                            style={getIconStyle(active)}
                          />
                        )}
                        <span className={cn(
                          "text-sm font-medium transition-all duration-300",
                          active && colorSchema && "font-semibold"
                        )}>
                          {getTitle(item)}
                        </span>
                        <ChevronDown
                          className={cn(
                            "relative top-[1px] ltr:ml-1 rtl:mr-1 h-4 w-4 transition-all duration-300",
                            "group-data-[state=open]:rotate-180"
                          )}
                          style={getIconStyle(active)}
                          aria-hidden="true"
                        />
                        {renderActiveIndicator(active)}
                      </div>
                    </NavigationMenu.Trigger>
                    <NavigationMenu.Content
                      className={cn(
                        "w-full rounded-xl border bg-popover text-popover-foreground shadow-xl",
                        colorSchema && "border-opacity-50"
                      )}
                      style={colorSchema ? {
                        borderColor: `${primaryColor}20`,
                      } : undefined}
                    >
                      {hasMegaMenu && <MegaMenu megaMenu={item.megaMenu} />}
                      {hasChild &&
                        !hasMegaMenu &&
                        (isNestedStructure(item.child) ? (
                          <PartialMegaMenu menu={item} />
                        ) : (
                          <ChildMenu childItems={item.child} />
                        ))}
                    </NavigationMenu.Content>
                  </>
                ) : (
                  <NavigationMenu.Link asChild>
                    <Link
                      href={item.href || "#"}
                      className={cn(
                        getItemClasses(active),
                        "px-3 rounded-lg",
                        colorSchema && !active && schema.bgHover
                      )}
                    >
                      {item.icon && (
                        <Icon
                          icon={item.icon}
                          className={cn(
                            "h-5 w-5 ltr:mr-2 rtl:ml-2 transition-all duration-300",
                            active && colorSchema && "drop-shadow-sm"
                          )}
                          style={getIconStyle(active)}
                        />
                      )}
                      <span className={cn(
                        "text-sm font-medium transition-all duration-300",
                        active && colorSchema && "font-semibold"
                      )}>
                        {getTitle(item)}
                      </span>
                      {renderActiveIndicator(active)}
                    </Link>
                  </NavigationMenu.Link>
                )}
              </NavigationMenu.Item>
            );
          })}
        </NavigationMenu.List>
        <div className="absolute top-full left-0">
          <NavigationMenu.Viewport
            style={{
              display: offset === null ? "none" : undefined,
              transform: document.documentElement.dir === 'rtl'
                ? `translateX(${offset}px)`
                : `translateX(${offset}px)`,
              top: "100%",
              transition: "all 0.3s ease",
            }}
          />
        </div>
      </NavigationMenu.Root>
    </div>
  );
}
