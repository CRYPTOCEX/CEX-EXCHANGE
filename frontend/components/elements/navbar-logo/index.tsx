"use client";

import React from "react";
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
  const logoHref = href || (isInAdmin ? "/admin" : "/");
  
  // Get the navbar logo display setting
  const navbarLogoDisplay = settings?.navbarLogoDisplay || "SQUARE_WITH_NAME";
  
  // Determine whether to show site name based on setting or override
  const shouldShowSiteName = showSiteName !== undefined 
    ? showSiteName 
    : navbarLogoDisplay === "SQUARE_WITH_NAME";

  // Determine logo type based on the display setting
  const logoType = navbarLogoDisplay === "FULL_LOGO_ONLY" ? "text" : "icon";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div>
        <Link href={logoHref} className="text-primary flex items-center gap-2">
          <Logo 
            type={logoType}
            className={cn(
              navbarLogoDisplay === "FULL_LOGO_ONLY" ? "h-8" : "h-7 w-7"
            )}
          />
          {shouldShowSiteName && navbarLogoDisplay !== "FULL_LOGO_ONLY" && (
            <span className="text-xl font-semibold lg:inline-block hidden">
              {siteName}
            </span>
          )}
        </Link>
      </div>
    </div>
  );
};

export default NavbarLogo;