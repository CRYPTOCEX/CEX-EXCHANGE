"use client";

import React from "react";
import Logo from "@/components/elements/logo";
import { Link } from "@/i18n/routing";
import { siteName } from "@/lib/siteInfo";
import { useConfigStore } from "@/store/config";
import { useBrandBoot } from "@/store/brand-boot";
import { resolveLogoDisplay } from "@/lib/brand/logo-display";
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
  const { settings, settingsFetched } = useConfigStore();
  const brandBoot = useBrandBoot();
  const logoHref = href || (isInAdmin ? "/admin" : "/");

  /*
   * WHICH MARK — and the server gets a vote now.
   *
   * This used to be `settings?.navbarLogoDisplay || "SQUARE_WITH_NAME"` read
   * straight from the config store, and that one line was the reported layout
   * shift: the store is written by an effect and rehydrated from localStorage,
   * so the server had nothing and always rendered the default. On an install
   * set to `FULL_LOGO_ONLY` — most of them — every page load drew a 40px square
   * plus the site name, then replaced it with a ~220px wordmark, dragging the
   * whole nav sideways.
   *
   * `brandBoot` is the same setting, resolved during the server render and
   * carried down per request. See `store/brand-boot.ts` for why it is a context
   * rather than a write to the store, and `lib/brand/logo-display.ts` for why a
   * store that has actually FETCHED still outranks it (so an admin editing the
   * setting sees the bar beside them change).
   */
  const navbarLogoDisplay = resolveLogoDisplay({
    boot: brandBoot.logoDisplay,
    stored: settings?.navbarLogoDisplay,
    storedIsFresh: settingsFetched,
  });

  // Determine logo type based on setting
  const logoType = navbarLogoDisplay === "FULL_LOGO_ONLY" ? "text" : "icon";

  // Determine if we should show the site name text
  const showSiteName = navbarLogoDisplay === "SQUARE_WITH_NAME";

  return (
    <Link
      href={logoHref}
      /* Hidden entirely while the admin assistant is pinned. The bar has given
         26rem to the panel, and on an admin screen the logo is the one item
         that is pure identity — the home button beside it already carries the
         navigation, so this costs nothing and buys the most. See globals.css. */
      data-navbar-logo=""
      className={cn("flex items-center gap-3 min-w-0", className)}
    >
      <Logo type={logoType} className="shrink-0" />
      {showSiteName && (
        <span
          /* Dropped while the admin assistant is pinned: the bar has given
             26rem to the panel, and the wordmark repeats a logo the reader is
             already looking at. See the pinned-rail block in globals.css. */
          data-navbar-logo-name=""
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
