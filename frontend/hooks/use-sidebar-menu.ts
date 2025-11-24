"use client";
import { useState, useEffect, useCallback } from "react";
import { isLocationMatch, getDynamicPath } from "@/lib/utils";
import { usePathname } from "@/i18n/routing";

interface MenuItem {
  key?: string;
  title: string;
  href?: string;
  icon?: any;
  child?: MenuItem[];
  permission?: string[];
  extension?: string;
  env?: string;
  settings?: string[];
  auth?: boolean;
  isHeader?: boolean;
}

interface UseSidebarMenuProps {
  sideMenu: MenuItem[];
}

export function useSidebarMenu({ sideMenu }: UseSidebarMenuProps) {
  const [activeSubmenu, setActiveSubmenu] = useState<number | null>(null);
  const [activeMultiMenu, setActiveMultiMenu] = useState<number | null>(null);

  const [activeItem, setActiveItem] = useState<{
    parentIndex: number | null;
    childIndex: number | null;
    grandChildIndex: number | null;
  }>({
    parentIndex: null,
    childIndex: null,
    grandChildIndex: null,
  });

  const pathname = usePathname();
  const locationName = getDynamicPath(pathname);

  useEffect(() => {
    if (!sideMenu || sideMenu.length === 0) return;

    let foundSubMenuIndex: number | null = null;
    let foundMultiMenuIndex: number | null = null;
    let foundActiveItem = {
      parentIndex: null as number | null,
      childIndex: null as number | null,
      grandChildIndex: null as number | null,
    };

    sideMenu.forEach((item: MenuItem, i: number) => {
      if (item.child && item.child.length > 0) {
        item.child.forEach((childItem: MenuItem, j: number) => {
          // Check if direct child is active
          if (childItem.href && isLocationMatch(childItem.href, locationName)) {
            foundSubMenuIndex = i;
            foundActiveItem = {
              parentIndex: i,
              childIndex: j,
              grandChildIndex: null,
            };
          }

          // Check grandchild level
          if (childItem.child && childItem.child.length > 0) {
            childItem.child.forEach((grandChildItem: MenuItem, k: number) => {
              if (
                grandChildItem.href &&
                isLocationMatch(grandChildItem.href, locationName)
              ) {
                foundSubMenuIndex = i;
                foundMultiMenuIndex = j;
                foundActiveItem = {
                  parentIndex: i,
                  childIndex: j,
                  grandChildIndex: k,
                };
              }
            });
          }
        });
      } else {
        // Match top-level without children
        if (item.href && isLocationMatch(item.href, locationName)) {
          foundSubMenuIndex = null;
          foundMultiMenuIndex = null;
          foundActiveItem = {
            parentIndex: i,
            childIndex: null,
            grandChildIndex: null,
          };
        }
      }
    });

    setActiveSubmenu(foundSubMenuIndex);
    setActiveMultiMenu(foundMultiMenuIndex);
    setActiveItem(foundActiveItem);
  }, [locationName, sideMenu]);

  const toggleSubmenu = (i: number) => {
    setActiveSubmenu((prev) => (prev === i ? null : i));
  };

  const toggleMultiMenu = (subIndex: number) => {
    setActiveMultiMenu((prev) => (prev === subIndex ? null : subIndex));
  };

  const isItemActive = useCallback(
    (parentIndex: number, childIndex?: number, grandChildIndex?: number) => {
      return (
        parentIndex === activeItem.parentIndex &&
        (childIndex === undefined || childIndex === activeItem.childIndex) &&
        (grandChildIndex === undefined ||
          grandChildIndex === activeItem.grandChildIndex)
      );
    },
    [activeItem]
  );

  return {
    activeSubmenu,
    activeMultiMenu,
    locationName,
    toggleSubmenu,
    toggleMultiMenu,
    isItemActive,
  };
}
