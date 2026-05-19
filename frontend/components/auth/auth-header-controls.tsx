"use client";

import { useMediaQuery } from "@/hooks/use-media-query";
import { useState, useEffect, useReducer } from "react";
import { useUserStore } from "@/store/user";
import { AuthModal } from "@/components/auth/auth-modal";
import ProfileInfo from "../partials/header/profile-info";
import { useReturnParam } from "@/hooks/use-return-param";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";

export function AuthHeaderControls({
  isMobile = false,
  variant = "default",
  square = false,
}: {
  isMobile?: boolean;
  variant?: "default" | "binary";
  square?: boolean;
}) {
  const t = useTranslations("common");
  const tComponentsAuth = useTranslations("components_auth");
  const returnTo = useReturnParam();
  const user = useUserStore((state) => state.user);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalView, setAuthModalView] = useState<
    "login" | "register" | "forgot-password"
  >("login");

  // Check if we're on mobile
  const isSmallScreen = useMediaQuery("(max-width: 768px)");

  // Determine if we should show mobile UI
  const showMobileUI = isMobile || isSmallScreen;

  // Use useReducer instead of useState for force update
  const [, forceUpdate] = useReducer((x) => x + 1, 0);

  // Handle mounting state
  useEffect(() => {
    setMounted(true);
  }, []);

  // Subscribe to user state changes
  useEffect(() => {
    const unsubscribe = useUserStore.subscribe(() => forceUpdate());
    return () => unsubscribe();
  }, []);

  // Determine dark mode - default to dark during SSR
  const darkMode = !mounted ? true : resolvedTheme === "dark";

  const openLoginModal = () => {
    setAuthModalView("login");
    setIsAuthModalOpen(true);
  };

  const openRegisterModal = () => {
    setAuthModalView("register");
    setIsAuthModalOpen(true);
  };

  // Render different UI for mobile and desktop
  return (
    <>
      {user ? (
        <ProfileInfo square={square} />
      ) : (
        // UI for logged-out user - styled as header sections
        <div className="flex items-center h-full">
          {variant === "binary" ? (
            <>
              {/* Binary variant - original flat style */}
              <button
                onClick={openLoginModal}
                className={`h-10 px-4 flex items-center justify-center text-sm font-medium cursor-pointer ${
                  showMobileUI ? "border-l" : "border-r"
                } ${
                  darkMode
                    ? "border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                    : "border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                } transition-colors`}
              >
                {showMobileUI ? "Login" : t("log_in")}
              </button>
              {!showMobileUI && (
                <button
                  onClick={openRegisterModal}
                  className="h-10 px-4 flex items-center justify-center text-sm font-medium cursor-pointer transition-colors bg-[#F7941D] text-black hover:bg-[#F7941D]/90"
                >
                  {tComponentsAuth("sign_up")}
                </button>
              )}
            </>
          ) : (
            <>
              {/* Default variant - rounded button style matching theme toggle */}
              <div className="flex items-center gap-2 px-2">
                <button
                  onClick={openLoginModal}
                  className="h-10 px-4 flex items-center justify-center text-sm font-medium cursor-pointer transition-colors rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  {t("log_in")}
                </button>
                {!showMobileUI && (
                  <button
                    onClick={openRegisterModal}
                    className="h-10 px-4 flex items-center justify-center text-sm font-medium cursor-pointer transition-colors rounded-lg bg-white text-black hover:bg-zinc-200"
                  >
                    {tComponentsAuth("sign_up")}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialView={authModalView}
        onViewChange={(view) =>
          setAuthModalView(view as "login" | "register" | "forgot-password")
        }
        returnTo={returnTo}
      />
    </>
  );
}
