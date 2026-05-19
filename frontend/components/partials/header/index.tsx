"use client";

import React from "react";
import { useThemeStore } from "@/store";
import { usePathname } from "@/i18n/routing";
import SiteHeader from "./site-header";

function getPathAfterLocale(pathname: string) {
  return pathname.replace(/^\/[a-z]{2}(\/|$)/, "/");
}

/**
 * Main Header Component
 *
 * This is the default header used throughout the application.
 * It automatically detects whether you're in admin or user area
 * and renders the appropriate navigation style.
 *
 * For extension pages that need custom menus, use SiteHeader directly:
 *
 * @example
 * // For extension with custom menu
 * import SiteHeader from "@/components/partials/header/site-header";
 *
 * <SiteHeader
 *   variant="extension"
 *   menu={customMenuItems}
 *   adminPath="/admin/my-extension"
 *   colorSchema={myColorSchema}
 * />
 */
const Header = () => {
  const { navbarType } = useThemeStore();
  const pathname = usePathname();
  const normalizedPath = getPathAfterLocale(pathname);

  if (navbarType === "hidden") {
    return null;
  }

  // Auto-detect variant based on path
  const isInAdmin = normalizedPath.startsWith("/admin");

  return (
    <SiteHeader
      variant={isInAdmin ? "admin" : "user"}
      menu={isInAdmin ? "admin" : "user"}
    />
  );
};

export default Header;

// Re-export SiteHeader for direct use
export { default as SiteHeader } from "./site-header";
export type { SiteHeaderProps } from "./site-header";
