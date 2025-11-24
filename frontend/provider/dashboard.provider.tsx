"use client";
import React, { ReactNode, useMemo, useLayoutEffect } from "react";
import { useUserStore } from "@/store/user";
import { useConfigStore } from "@/store/config";
import { useThemeStore } from "@/store";
import Header from "@/components/partials/header";
import Sidebar from "@/components/partials/sidebar";
import Footer from "@/components/partials/footer";
import { usePathname } from "@/i18n/routing";
import { LayoutWrapper } from "@/components/partials/dashboard/layout-wrapper";

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

  // Define an array of paths to exclude from using Header, Sidebar, and Footer.
  // These paths now support dynamic segments wrapped in square brackets.
  const excludedPaths = [
    "/admin/crm/kyc/level/create",
    "/admin/crm/kyc/level/[id]",
  ];

  // Check if the current path should exclude the layout components using our helper.
  const shouldExcludeLayout = excludedPaths.some((pattern) =>
    matchPath(pattern, location)
  );

  // Check if current path is an admin path
  const normalizedPath = getPathAfterLocale(location);
  const isAdminPath = normalizedPath.startsWith("/admin");
  const menuType = isAdminPath ? "admin" : "user";

  // Retrieve global configuration from the stores.
  const profile = useUserStore((state) => state.user);
  const { settings, extensions } = useConfigStore();

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
  }, [settings, extensions, profile, location]); // Add location to dependencies

  // Update the global store with the computed menu and theme settings.
  useLayoutEffect(() => {
    useThemeStore.setState({
      navbarType: layoutSettings.navbarType,
      footerType: layoutSettings.footerType,
      radius: layoutSettings.radius,
    });
  }, [layoutSettings]);

  // Conditionally render the layout based on the excluded paths.
  if (shouldExcludeLayout) {
    return (
      <div className="content-wrapper transition-all duration-150">
        <div className="page-min-height-horizontal">{children}</div>
      </div>
    );
  }

  if (isGuest || location.startsWith("/admin/builder/")) return <>{children}</>;

  // Only render admin layout for admin pages
  if (isAdminPath) {
    return (
      <>
        <Header />
        {/* Sidebar is only rendered for mobile - the Header handles desktop navigation */}
        <Sidebar menu={menuType} />
        <div className="content-wrapper transition-all duration-150">
          <div className="pt-5 px-6 pb-20 page-min-height-horizontal">
            <LayoutWrapper location={location}>{children}</LayoutWrapper>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  // For non-admin pages, just render children without admin layout
  return <>{children}</>;
};

export default DashBoardLayoutProvider;
