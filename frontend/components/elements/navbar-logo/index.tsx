"use client";

import React, { useState, useEffect } from "react";
import Logo from "@/components/elements/logo";
import { Link } from "@/i18n/routing";
import { siteName } from "@/lib/siteInfo";
import { useConfigStore } from "@/store/config";
import { cn } from "@/lib/utils";

interface NavbarLogoProps {
  href?: string;
  className?: string;
  showSiteName?: boolean; // Override for specific cases
  isInAdmin?: boolean;
}

const NavbarLogo = ({
  href,
  className,
  showSiteName,
  isInAdmin = false
}: NavbarLogoProps) => {
  const { settings } = useConfigStore();
  const [mounted, setMounted] = useState(false);
  const logoHref = href || (isInAdmin ? "/admin" : "/");

  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Always use default values on server and initial render to prevent hydration mismatch
  // Settings will update on client after mount
  const navbarLogoDisplay = mounted && settings?.navbarLogoDisplay
    ? settings.navbarLogoDisplay
    : "SQUARE_WITH_NAME";

  // Determine whether to show site name based on setting or override
  const shouldShowSiteName = showSiteName !== undefined
    ? showSiteName
    : navbarLogoDisplay === "SQUARE_WITH_NAME";

  // Determine logo type based on the display setting
  const logoType = navbarLogoDisplay === "FULL_LOGO_ONLY" ? "text" : "icon";

  // Better sizing logic
  const getLogoClassName = () => {
    switch (navbarLogoDisplay) {
      case "FULL_LOGO_ONLY":
        return "h-9 lg:h-12 w-auto max-w-[220px] lg:max-w-[280px]";
      case "ICON_ONLY":
        return "h-9 w-9 lg:h-10 lg:w-10";
      default: // SQUARE_WITH_NAME
        return "h-9 w-9 lg:h-10 lg:w-10";
    }
  };

  return (
    <div className={cn(
      "flex items-center gap-3",
      navbarLogoDisplay === "FULL_LOGO_ONLY" ? "min-w-0" : ""
    )}>
      <Link href={logoHref} className="text-primary flex items-center gap-3 min-w-0">
        <Logo
          type={logoType}
          className={cn(
            getLogoClassName(),
            "object-contain flex-shrink-0"
          )}
        />
        {shouldShowSiteName && navbarLogoDisplay !== "FULL_LOGO_ONLY" && (
          <span className={cn(
            "font-bold text-primary whitespace-nowrap",
            "text-lg lg:text-xl",
            "hidden sm:inline-block",
            "truncate max-w-[120px] lg:max-w-none"
          )}>
            {siteName}
          </span>
        )}
      </Link>
    </div>
  );
};

export default NavbarLogo;