"use client";
import React, { ReactNode, useMemo, useLayoutEffect } from "react";
import { useConfigStore } from "@/store/config";
import { useThemeStore } from "@/store";
/* `Header`, `Footer`, `LayoutWrapper` and `Sidebar` are all gone from this file.
   `Sidebar` was never rendered at all — it was imported here and mounted
   nowhere, which is why the admin had no sidebar for the life of the product
   (see plans/ADMIN-SYSTEM.md §0). The other three moved into
   `app/[locale]/(dashboard)/admin/layout.tsx`, which now owns the admin frame. */
import { usePathname } from "@/i18n/routing";

// Default site configuration
const defaultSiteConfig = {
  navbarType: "sticky",
  footerType: "default",
  radius: 0.5,
};

interface DashBoardLayoutProviderProps {
  isGuest?: boolean;
  children: ReactNode;
}

// Helper function to convert a path with variables to a regex and test it.
const matchPath = (pattern: string, pathname: string): boolean => {
  // Replace dynamic segments (e.g., [id]) with a regex that matches any non-slash sequence.
  const regexPattern = "^" + pattern.replace(/\[(\w+)\]/g, "[^/]+") + "$";
  const regex = new RegExp(regexPattern);
  return regex.test(pathname);
};

// Helper function to get path after locale
function getPathAfterLocale(pathname: string) {
  return pathname.replace(/^\/[a-z]{2}(\/|$)/, "/");
}

const DashBoardLayoutProvider = ({
  isGuest = false,
  children,
}: DashBoardLayoutProviderProps) => {
  const location = usePathname();

  /**
   * Chrome-free routes for the NON-ADMIN dashboard.
   *
   * This list used to hold 24 admin routes. It no longer does: /admin returns
   * early below, and app/[locale]/(dashboard)/admin/layout.tsx keeps its own
   * anchored CHROMELESS list of the genuinely full-bleed studio routes.
   * Twenty of the removed entries were ordinary READING pages -- every queue
   * detail page, Platform Settings, Extensions, Updates, Trading Settings --
   * that had thereby lost all navigation. That is the defect this rework exists
   * to fix, so they are not re-listed anywhere.
   *
   * A pattern may contain [segments]; matchPath turns each into a
   * single-segment wildcard.
   */
  const excludedPaths = [
    "/forex/trade/[id]"
  ];

  // Check if the current path should exclude the layout components using our helper.
  const shouldExcludeLayout = excludedPaths.some((pattern) =>
    matchPath(pattern, location)
  );

  // Check if current path is an admin path
  const normalizedPath = getPathAfterLocale(location);
  const isAdminPath = normalizedPath.startsWith("/admin");

  // Only `settings` is read now: this provider's remaining job is to hydrate
  // `useThemeStore` from the stored layout config. The menu, the user and the
  // extension list moved to the admin shell, which is what renders them.
  const { settings } = useConfigStore();

  // Calculate layout settings and menu only when dependencies change.
  const { layoutSettings } = useMemo(() => {
    let layoutConfig: any = defaultSiteConfig;
    if (typeof settings?.layout === "string") {
      try {
        layoutConfig = JSON.parse(settings.layout);
      } catch (e) {
        console.error("Failed to parse settings.layout as JSON:", e);
        layoutConfig = defaultSiteConfig;
      }
    } else if (
      typeof settings?.layout === "object" &&
      settings.layout !== null
    ) {
      layoutConfig = settings.layout;
    }
    const layoutSettings = {
      navbarType: layoutConfig.navbarType ?? defaultSiteConfig.navbarType,
      footerType: layoutConfig.footerType ?? defaultSiteConfig.footerType,
      radius:
        typeof layoutConfig.radius === "number"
          ? layoutConfig.radius
          : defaultSiteConfig.radius,
    };

    return { layoutSettings };
  }, [settings]); // Only depends on settings - location was incorrectly added here causing re-renders

  // Update the global store with the computed menu and theme settings.
  useLayoutEffect(() => {
    useThemeStore.setState({
      navbarType: layoutSettings.navbarType,
      footerType: layoutSettings.footerType,
      radius: layoutSettings.radius,
    });
  }, [layoutSettings]);

  /**
   * `/admin` OWNS ITS OWN CHROME NOW.
   *
   * `app/[locale]/(dashboard)/admin/layout.tsx` renders the sidebar, the top bar
   * and the command palette, and keeps its own (anchored) list of genuinely
   * full-bleed studio routes. Returning children bare here is what
   * lets it: this provider still runs — it is what hydrates `useThemeStore` from
   * the stored layout settings — but it no longer decides what an admin page
   * looks like.
   *
   * The `excludedPaths` array above is now consulted for `/user` routes only.
   * It listed 24 admin routes, of which only four were real editors; the other
   * twenty were reading pages that had silently lost all navigation, which is
   * why approving a withdrawal used to strand you with no way back to the queue.
   */
  if (isAdminPath) return <>{children}</>;

  // Conditionally render the layout based on the excluded paths.
  if (shouldExcludeLayout) {
    return (
      <div className="content-wrapper transition-all duration-150">
        <div className="page-min-height-horizontal">{children}</div>
      </div>
    );
  }

  if (isGuest) return <>{children}</>;

  // For non-admin pages, just render children without admin layout
  return <>{children}</>;
};

export default DashBoardLayoutProvider;
