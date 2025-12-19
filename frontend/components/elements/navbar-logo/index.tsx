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
  isInAdmin?: boolean;
  alwaysShowName?: boolean; // Force show name even on mobile (for mobile menu)
}

const NavbarLogo = ({
  href,
  className,
  isInAdmin = false,
  alwaysShowName = false,
}: NavbarLogoProps) => {
  const { settings } = useConfigStore();
  const logoHref = href || (isInAdmin ? "/admin" : "/");

  // Get display setting, default to SQUARE_WITH_NAME
  const navbarLogoDisplay = settings?.navbarLogoDisplay || "SQUARE_WITH_NAME";

  // Determine logo type based on setting
  const logoType = navbarLogoDisplay === "FULL_LOGO_ONLY" ? "text" : "icon";

  // Determine if we should show the site name text
  const showSiteName = navbarLogoDisplay === "SQUARE_WITH_NAME";

  return (
    <Link
      href={logoHref}
      className={cn("flex items-center gap-3 min-w-0", className)}
    >
      <Logo type={logoType} className="shrink-0" />
      {showSiteName && (
        <span
          className={cn(
            "font-bold text-primary whitespace-nowrap text-lg lg:text-xl truncate",
            alwaysShowName ? "inline-block" : "hidden sm:inline-block"
          )}
        >
          {siteName}
        </span>
      )}
    </Link>
  );
};

export default NavbarLogo;
