"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Moon, Sun, ChevronLeft, Settings } from "lucide-react";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import { NotificationBell } from "./notification-bell";
import { Link, usePathname } from "@/i18n/routing";
import { useMediaQuery } from "@/hooks/use-media-query";
import MainMenu from "./horizontal-menu";
import { AuthHeaderControls } from "@/components/auth/auth-header-controls";
import { useUserStore } from "@/store/user";
import { useConfigStore } from "@/store/config";
import LanguageSelector from "./language-selector";
import { useTranslations } from "next-intl";
import MobileMenuHandler from "./mobile-menu-handler";
import MobileSidebar from "@/components/partials/sidebar";
import CustomMobileMenu from "./custom-mobile-menu";
import NavbarLogo from "@/components/elements/navbar-logo";

const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "Bicrypto";
const defaultTheme = process.env.NEXT_PUBLIC_DEFAULT_THEME || "dark";

// MenuItem interface is defined globally in types/menu.d.ts

interface SiteHeaderProps {
  menu?: "user" | MenuItem[];
  rightControls?: React.ReactNode;
  title?: string;
}

export const SiteHeader: React.FC<SiteHeaderProps> = ({
  menu = "user",
  rightControls,
  title,
}) => {
  const t = useTranslations("components/partials/header/site-header");
  const pathname = usePathname();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { user, hasPermission } = useUserStore();
  const { settings } = useConfigStore();

  // Hydration fix: mount state
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Check if layout switcher is enabled (handle both string and boolean values)
  const layoutSwitcherEnabled = settings?.layoutSwitcher === true || settings?.layoutSwitcher === "true";

  // Set default theme if layout switcher is disabled
  useEffect(() => {
    if (mounted && !layoutSwitcherEnabled && theme !== defaultTheme) {
      setTheme(defaultTheme);
    }
  }, [mounted, layoutSwitcherEnabled, theme, setTheme]);

  // Call all hooks unconditionally, per React rules
  const mediaQueryDesktop = useMediaQuery("(min-width: 1280px)");
  const isDesktop = mounted && mediaQueryDesktop;
  const isCustomMenu = Array.isArray(menu);
  const isDark = mounted ? resolvedTheme === "dark" : false;

  // Determine if we're in an admin area
  const isInAdminArea = pathname.startsWith("/admin");
  const backButtonHref = isInAdminArea ? "/admin" : "/";

  // Calculate the user equivalent of the current admin path
  const userEquivalentPath = isInAdminArea
    ? pathname.replace("/admin", "") || "/"
    : "/admin";

  // For scroll effect, this is fine to run server-side
  const [isScrolled, setIsScrolled] = useState(false);
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Don't render anything until mounted to prevent hydration mismatch
  if (!mounted) {
    return null;
  }

  return (
    <>
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          isScrolled
            ? isDark
              ? "bg-zinc-950/95 backdrop-blur-xl border-b border-zinc-800/50 shadow-lg"
              : "bg-white/95 backdrop-blur-xl border-b border-zinc-200/50 shadow-lg"
            : isDark
              ? "bg-gradient-to-b from-zinc-950/90 to-zinc-950/40"
              : "bg-gradient-to-b from-white/80 to-white/40"
        )}
      >
        <div className="container mx-auto px-4 lg:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Left Side: Mobile Menu, Logo, and Navigation */}
            <div className="flex items-center gap-3 lg:gap-6">
              {!isDesktop && (
                <div className="flex items-center">
                  <MobileMenuHandler />
                </div>
              )}
              
              {isCustomMenu && isInAdminArea ? (
                <div className="flex items-center gap-3">
                  <Link 
                    href={backButtonHref} 
                    className="flex items-center p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <ChevronLeft className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                  </Link>
                  <div className="flex items-center gap-3">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      transition={{ duration: 0.2 }}
                      className="relative"  
                    >
                      <NavbarLogo href="/" isInAdmin={isInAdminArea} />
                    </motion.div>
                    {title && (
                      <div className="hidden sm:flex flex-col">
                        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">
                          {title}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ) : isCustomMenu ? (
                // Custom menu (not admin area) - show chevron on hover
                <div className="group flex items-center gap-3 relative">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.2 }}
                    className="relative flex items-center"
                  >
                    <NavbarLogo href="/" isInAdmin={false} />
                    
                    {/* Animated chevron that appears on hover */}
                    <div className="absolute -left-6 opacity-0 translate-x-2 scale-75 group-hover:opacity-100 group-hover:translate-x-0 group-hover:scale-100 transition-all duration-300 ease-out">
                      <ChevronLeft 
                        className={cn(
                          "h-4 w-4",
                          isDark ? "text-zinc-400" : "text-zinc-600"
                        )} 
                      />
                    </div>
                  </motion.div>
                </div>
              ) : (
                // Default user menu
                <div className="flex items-center gap-3">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.2 }}
                    className="relative"
                  >
                    <NavbarLogo href="/" isInAdmin={false} />
                  </motion.div>
                </div>
              )}
              
              {/* Desktop Navigation */}
              {isDesktop && (
                <div className="ml-8">
                  <MainMenu menu={menu} />
                </div>
              )}
            </div>

            {/* Right Side: Controls and User Actions */}
            <div className="flex items-center gap-2 lg:gap-3">
              {/* Custom Right Controls */}
              {rightControls && (
                <div className="flex items-center">
                  {rightControls}
                </div>
              )}
              
              {/* Admin Toggle */}
              {hasPermission("access.admin") && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="hidden sm:block"
                >
                  <Link href={userEquivalentPath}>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                        isDark
                          ? "text-zinc-300 hover:text-white hover:bg-zinc-800/70 border border-zinc-700/50"
                          : "text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100/70 border border-zinc-200/50"
                      )}
                    >
                      {isInAdminArea ? (
                        <>
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                          </svg>
                          <span className="hidden lg:inline">{t("User")}</span>
                        </>
                      ) : (
                        <>
                          <Settings className="h-4 w-4" />
                          <span className="hidden lg:inline">{t("Admin")}</span>
                        </>
                      )}
                    </motion.button>
                  </Link>
                </motion.div>
              )}
              
              {/* Language Selector */}
              <div className="hidden md:block">
                <LanguageSelector variant="compact" />
              </div>
              
              {/* Theme Toggle - only show if layout switcher is enabled */}
              {layoutSwitcherEnabled && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    "p-2.5 rounded-lg transition-all duration-200 hidden md:flex items-center justify-center",
                    isDark
                      ? "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/70 border border-zinc-700/50"
                      : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/70 border border-zinc-200/50"
                  )}
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                >
                  <AnimatePresence mode="wait">
                    {isDark ? (
                      <motion.div
                        key="sun"
                        initial={{ opacity: 0, rotate: -90, scale: 0.8 }}
                        animate={{ opacity: 1, rotate: 0, scale: 1 }}
                        exit={{ opacity: 0, rotate: 90, scale: 0.8 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Sun className="h-4 w-4" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="moon"
                        initial={{ opacity: 0, rotate: 90, scale: 0.8 }}
                        animate={{ opacity: 1, rotate: 0, scale: 1 }}
                        exit={{ opacity: 0, rotate: -90, scale: 0.8 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Moon className="h-4 w-4" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              )}
              
              {/* Notifications - only show when user is logged in */}
              {user && (
                <div className="hidden md:block">
                  <NotificationBell />
                </div>
              )}
              
              {/* Auth Controls */}
              <div className="flex items-center">
                <AuthHeaderControls />
              </div>
            </div>
          </div>
        </div>
      </motion.header>
      
      {/* Mobile Menu */}
      {isCustomMenu && isInAdminArea ? (
        <CustomMobileMenu menu={menu} siteName={siteName} />
      ) : (
        <MobileSidebar menu={menu} />
      )}
    </>
  );
};

export default SiteHeader;
