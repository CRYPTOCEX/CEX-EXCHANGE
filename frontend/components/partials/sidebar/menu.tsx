"use client";
import React from "react";
import { cn } from "@/lib/utils";
import NestedSubMenu from "./nested-menus";
import MenuLabel from "./menu-label";
import { useSidebarMenu } from "@/hooks/use-sidebar-menu";
import SingleMenuItem from "./single-menu-item";
import SubMenuHandler from "./sub-menu-handler";

interface MenuItem {
  title: string;
  href?: string;
  icon?: any;
  child?: MenuItem[];
  isHeader?: boolean;
}

interface SidebarMenuProps {
  sideMenu: MenuItem[];
  collapsed?: boolean;
  hovered?: boolean;
  isRtl?: boolean;
  className?: string;
  showLabels?: boolean;
}

const SidebarMenu: React.FC<SidebarMenuProps> = ({
  sideMenu,
  collapsed = false,
  hovered = false,
  isRtl = false,
  className,
  showLabels = true,
}) => {
  const {
    activeSubmenu,
    activeMultiMenu,
    toggleSubmenu,
    toggleMultiMenu,
    isItemActive,
  } = useSidebarMenu({ sideMenu });

  if (!sideMenu || sideMenu.length === 0) {
    return null;
  }

  return (
    <ul
      dir={isRtl ? "rtl" : "ltr"}
      className={cn(
        "space-y-1",
        { "text-center": collapsed, "text-start": collapsed && hovered },
        className
      )}
    >
      {sideMenu.map((item, i) => {
        const hasChild = item.child && item.child.length > 0;
        const isActiveTopLevel = isItemActive(i);
        return (
          <li key={`menu_key_${i}`}>
            {!hasChild && !item.isHeader && (
              <SingleMenuItem
                item={item}
                collapsed={collapsed}
                hovered={hovered}
                isActive={isActiveTopLevel}
              />
            )}
            {item.isHeader &&
              !hasChild &&
              showLabels &&
              (!collapsed || hovered) && <MenuLabel item={item} />}
            {hasChild && (
              <>
                <SubMenuHandler
                  item={item}
                  toggleSubmenu={toggleSubmenu}
                  index={i}
                  activeSubmenu={activeSubmenu}
                  collapsed={collapsed}
                  hovered={hovered}
                  isActive={isActiveTopLevel}
                />
                {(!collapsed || hovered) && (
                  <NestedSubMenu
                    toggleMultiMenu={toggleMultiMenu}
                    activeMultiMenu={activeMultiMenu}
                    activeSubmenu={activeSubmenu}
                    item={item}
                    index={i}
                    isItemActive={isItemActive}
                  />
                )}
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
};

export default SidebarMenu;
