"use client";
import React from "react";
import ThemeButton from "./theme-button";
import { useSidebar, useThemeStore } from "@/store";
import HorizontalHeader from "./horizontal-header";
import Language from "./language";
import { useMediaQuery } from "@/hooks/use-media-query";
import MobileMenuHandler from "./mobile-menu-handler";
import FullScreen from "./full-screen";
import { headerVariants, mapNavbarType } from "@/lib/variants/layout";
import MainMenu from "./horizontal-menu";
import { AuthHeaderControls } from "@/components/auth/auth-header-controls";
import { usePathname, Link } from "@/i18n/routing";
import { useUserStore } from "@/store/user";
import { User, Settings } from "lucide-react";
import { useTranslations } from "next-intl";

function getPathAfterLocale(pathname: string) {
  return pathname.replace(/^\/[a-z]{2}(\/|$)/, "/");
}

const Header = () => {
  const { navbarType } = useThemeStore();

  const isDesktop = useMediaQuery("(min-width: 1280px)");
  const isMobile = useMediaQuery("(min-width: 768px)");

  const finalNavbarType = mapNavbarType(navbarType);

  const headerClasses = headerVariants({
    navbarType: finalNavbarType,
  });

  const pathname = usePathname();
  const normalizedPath = getPathAfterLocale(pathname);

  const menuType = normalizedPath.startsWith("/admin") ? "admin" : "user";

  if (navbarType === "hidden") {
    return null;
  }

  const HeaderContent = () => {
    const isInAdmin = normalizedPath.startsWith("/admin");
    
    return (
    <div className="flex justify-between items-center h-full">
        {/* Show mobile menu toggle on left for admin, normal layout for user */}
        {isInAdmin && !isDesktop ? (
          <>
            <div className="flex items-center gap-3">
              <MobileMenuHandler />
              <HorizontalHeader isInAdmin={isInAdmin} />
            </div>
            <NavTools isDesktop={isDesktop} isMobile={isMobile} excludeMobileToggle={true} />
          </>
        ) : (
          <>
            <HorizontalHeader isInAdmin={isInAdmin} />
            <NavTools isDesktop={isDesktop} isMobile={isMobile} excludeMobileToggle={false} />
          </>
        )}
    </div>
  );
  };

  return (
    <header className={headerClasses}>
      <div className="w-full bg-card/90 backdrop-blur-lg md:px-6 px-4 py-3 border-b">
        <HeaderContent />
      </div>
      {isDesktop && (
        <div className="bg-card/90 backdrop-blur-lg w-full px-6 shadow-md">
          <MainMenu menu={menuType} />
        </div>
      )}
    </header>
  );
};

export default Header;

const NavTools = ({
  isDesktop,
  isMobile,
  excludeMobileToggle = false,
}: {
  isDesktop: boolean;
  isMobile: boolean;
  excludeMobileToggle?: boolean;
}) => {
  const t = useTranslations("components/partials/header/index");
  const { user, hasPermission } = useUserStore();
  const pathname = usePathname();
  const normalizedPath = getPathAfterLocale(pathname);
  const isInAdmin = normalizedPath.startsWith("/admin");
  const canAccessAdmin =
    hasPermission("access.admin") || user?.role?.name === "Super Admin";

  return (
    <div className="nav-tools flex items-center gap-2">
      {/* User/Admin Navigation Buttons */}
      {isInAdmin ? (
        // Show "Go to User" button when in admin section
        <Link href="/">
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:text-white dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">{t("User")}</span>
          </button>
        </Link>
      ) : (
        // Show "Go to Admin" button when in user section (if has permission)
        canAccessAdmin && (
          <Link href="/admin">
            <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:text-white dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">{t("Admin")}</span>
            </button>
          </Link>
        )
      )}
      {isDesktop && <Language />}
      {isDesktop && <FullScreen />}
      <ThemeButton />
      <div className="ltr:pl-2 rtl:pr-2">
        <AuthHeaderControls />
      </div>
      {!isDesktop && !excludeMobileToggle && <MobileMenuHandler />}
    </div>
  );
};
