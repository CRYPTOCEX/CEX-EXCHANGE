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

import ChildMenu from "./menu/child-menu";
import MegaMenu from "./menu/mega-menu";
import PartialMegaMenu from "./menu/partial-mega-menu";
import { Icon } from "@iconify/react";

// Support both string ("user", "admin") and array (custom menu)
export default function MainMenu({ menu }) {
  const pathname = usePathname();
  const user = useUserStore((s) => s.user);
  const { settings, extensions, settingsFetched } = useSettings();

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
      const triggerOffsetLeft = trigger.offsetLeft + trigger.offsetWidth / 6;
      setOffset(Math.round(triggerOffsetLeft));
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

  if (!menuItems || menuItems.length === 0) return null;

  return (
    <div>
      <NavigationMenu.Root
        onValueChange={setValue}
        delayDuration={300}
        className="flex relative justify-start group"
      >
        <NavigationMenu.List
          ref={setList}
          className="group flex list-none gap-5"
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
                          "flex items-center py-4 cursor-pointer group transition",
                          active
                            ? "text-primary border-b-2 border-primary font-semibold"
                            : "hover:text-primary"
                        )}
                      >
                        {item.icon && (
                          <Icon icon={item.icon} className="h-5 w-5 mr-2" />
                        )}
                        <span className="text-sm font-medium text-foreground">
                          {item.title}
                        </span>
                        <ChevronDown
                          className="relative top-[1px] ml-1 h-4 w-4 transition duration-200 group-data-[state=open]:rotate-180"
                          aria-hidden="true"
                        />
                      </div>
                    </NavigationMenu.Trigger>
                    <NavigationMenu.Content
                      className={cn(
                        "w-full rounded-md border bg-popover text-popover-foreground shadow-lg"
                      )}
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
                        "flex items-center py-4 cursor-pointer transition",
                        active
                          ? "text-primary border-b-2 border-primary font-semibold"
                          : "hover:text-primary"
                      )}
                    >
                      {item.icon && (
                        <Icon icon={item.icon} className="h-5 w-5 mr-2" />
                      )}
                      <span className="text-sm font-medium text-foreground">
                        {item.title}
                      </span>
                    </Link>
                  </NavigationMenu.Link>
                )}
              </NavigationMenu.Item>
            );
          })}
        </NavigationMenu.List>
        <div className="absolute top-full">
          <NavigationMenu.Viewport
            style={{
              display: !offset ? "none" : undefined,
              transform: `translateX(${offset}px)`,
              top: "100%",
              transition: "all 0.3s ease",
            }}
          />
        </div>
      </NavigationMenu.Root>
    </div>
  );
}
