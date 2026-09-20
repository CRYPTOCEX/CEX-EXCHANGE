"use client";

import { useMediaQuery } from "@/hooks/use-media-query";
import { useState, useEffect, useReducer, type ReactNode } from "react";
import { useUserStore } from "@/store/user";
import { AuthModal } from "@/components/auth/auth-modal";
import ProfileInfo from "../partials/header/profile-info";
import { useReturnParam } from "@/hooks/use-return-param";
import { useTranslations } from "next-intl";

export function AuthHeaderControls({
  isMobile = false,
  variant = "default",
  square = false,
  balanceSlot,
}: {
  isMobile?: boolean;
  variant?: "default" | "binary";
  square?: boolean;
  /**
   * FORWARDED, never consumed here. It is the profile panel's balance block,
   * and only the signed-IN branch has a panel to put it in — a signed-out
   * visitor has no account, and therefore no balances of any kind to show.
   * See `ProfileMenuPanelProps.balanceSlot`.
   */
  balanceSlot?: (ctx: { onNavigate?: () => void }) => ReactNode;
}) {
  const t = useTranslations("common");
  const returnTo = useReturnParam();
  const user = useUserStore((state) => state.user);

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

  // Subscribe to user state changes
  useEffect(() => {
    const unsubscribe = useUserStore.subscribe(() => forceUpdate());
    return () => unsubscribe();
  }, []);

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
        <ProfileInfo square={square} balanceSlot={balanceSlot} />
      ) : (
        /* UI for logged-out user - styled as header sections.
           `shrink-0` + `whitespace-nowrap` on every button below: these are the
           two CTAs a signed-out visitor is here for, and a flex row squeezed by
           a wider neighbour was breaking "Log In" across two lines, which grows
           the bar. They now hold their size and the flexible controls beside
           them give up the width instead. */
        <div className="flex items-center h-full shrink-0">
          {variant === "binary" ? (
            <>
              {/* Binary variant - original flat style */}
              <button
                onClick={openLoginModal}
                className={`h-10 shrink-0 whitespace-nowrap px-4 flex items-center justify-center text-sm font-medium cursor-pointer ${
                  showMobileUI ? "border-l" : "border-r"
                } border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors`}
              >
                {showMobileUI ? t("login") : t("log_in")}
              </button>
              {!showMobileUI && (
                <button
                  onClick={openRegisterModal}
                  className="h-10 shrink-0 whitespace-nowrap px-4 flex items-center justify-center text-sm font-medium cursor-pointer transition-colors bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {t("sign_up")}
                </button>
              )}
            </>
          ) : (
            <>
              {/* Default variant - rounded button style matching theme toggle */}
              <div className="flex items-center gap-2 px-2">
                <button
                  onClick={openLoginModal}
                  className="h-10 shrink-0 whitespace-nowrap px-4 flex items-center justify-center text-sm font-medium cursor-pointer transition-colors rounded-lg border border-border text-muted-foreground hover:bg-muted"
                >
                  {t("log_in")}
                </button>
                {!showMobileUI && (
                  <button
                    onClick={openRegisterModal}
                    className="h-10 shrink-0 whitespace-nowrap px-4 flex items-center justify-center text-sm font-medium cursor-pointer transition-colors rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {t("sign_up")}
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
