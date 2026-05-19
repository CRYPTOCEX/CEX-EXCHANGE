import Logo from "@/components/elements/logo";
import { siteName } from "@/lib/siteInfo";
import { useSidebar } from "@/store";
import { useConfigStore } from "@/store/config";
import { cn } from "@/lib/utils";
import React, { useState, useEffect } from "react";

const SidebarLogo = ({
  hovered,
  isMobile = false,
}: {
  hovered?: boolean;
  isMobile?: boolean;
}) => {
  const { collapsed } = useSidebar();
  const { settings, settingsFetched } = useConfigStore();
  const [mounted, setMounted] = useState(false);

  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Get cached logo display setting from localStorage on initial load
  const getCachedLogoSetting = () => {
    if (typeof window === 'undefined') return "SQUARE_WITH_NAME";
    try {
      const cached = localStorage.getItem('bicrypto-config-store');
      if (cached) {
        const parsed = JSON.parse(cached);
        return parsed.state?.settings?.navbarLogoDisplay || "SQUARE_WITH_NAME";
      }
    } catch (error) {
      console.warn('Failed to parse cached logo settings:', error);
    }
    return "SQUARE_WITH_NAME";
  };

  // Use cached setting initially, then update when fresh data arrives
  const cachedSetting = getCachedLogoSetting();
  const navbarLogoDisplay = mounted ?
    (settingsFetched ? settings?.navbarLogoDisplay || "SQUARE_WITH_NAME" : cachedSetting) :
    cachedSetting;

  // Determine logo type and sizing based on the display setting
  const logoType = navbarLogoDisplay === "FULL_LOGO_ONLY" ? "text" : "icon";
  const shouldShowSiteName = navbarLogoDisplay === "SQUARE_WITH_NAME";

  // Better sizing logic for sidebar
  const getLogoClassName = () => {
    switch (navbarLogoDisplay) {
      case "FULL_LOGO_ONLY":
        return "h-10 lg:h-12 w-auto max-w-[180px] lg:max-w-[220px]";
      case "ICON_ONLY":
        return "h-8 w-8 lg:h-9 lg:w-9";
      default: // SQUARE_WITH_NAME
        return "h-8 w-8 lg:h-9 lg:w-9";
    }
  };

  return (
    <div className="px-4 py-4">
      <div className="flex items-center">
        <div className="flex flex-1 items-center gap-x-3 min-w-0">
          <Logo
            type={logoType}
            className={cn(
              getLogoClassName(),
              "object-contain flex-shrink-0"
            )}
          />
          {(!collapsed || hovered) && shouldShowSiteName && navbarLogoDisplay !== "FULL_LOGO_ONLY" && (
            <div className={cn(
              "flex-1 text-primary font-bold",
              "text-lg lg:text-xl",
              "truncate" // Prevent overflow in collapsed state
            )}>
              {siteName}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SidebarLogo;
