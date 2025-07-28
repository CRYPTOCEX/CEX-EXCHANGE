"use client";

import { useMediaQuery } from "@/hooks/use-media-query";
import { useState, useEffect, useReducer } from "react";
import { useUserStore } from "@/store/user";
import { Button } from "@/components/ui/button";
import { AuthModal } from "@/components/auth/auth-modal";
import ProfileInfo from "../partials/header/profile-info";
import { useReturnParam } from "@/hooks/use-return-param";
import { useTranslations } from "next-intl";

export function AuthHeaderControls({
  isMobile = false,
}: {
  isMobile?: boolean;
}) {
  const t = useTranslations("components/auth/auth-header-controls");
  const returnTo = useReturnParam();
  const user = useUserStore((state) => state.user);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalView, setAuthModalView] = useState<
    "login" | "register" | "forgot-password"
  >("login");
  // Removed auto-opening modal logic - modal should only open when user clicks a button

  // Check if we're on mobile
  const isSmallScreen = useMediaQuery("(max-width: 768px)");

  // Determine if we should show mobile UI
  const showMobileUI = isMobile || isSmallScreen;

  // Use useReducer instead of useState for force update
  // This is a common pattern for forcing re-renders
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
        <ProfileInfo />
      ) : // UI for logged-out user
      showMobileUI ? (
        // Compact mobile layout - side by side buttons
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="px-3 py-1.5 text-xs font-medium min-w-0 flex-shrink-0" 
            onClick={openLoginModal}
          >
            <span className="hidden xs:inline">{t("log_in")}</span>
            <span className="xs:hidden">Login</span>
          </Button>
          <Button 
            size="sm" 
            className="px-3 py-1.5 text-xs font-medium min-w-0 flex-shrink-0" 
            onClick={openRegisterModal}
          >
            <span className="hidden xs:inline">{t("sign_up")}</span>
            <span className="xs:hidden">Sign Up</span>
          </Button>
        </div>
      ) : (
        // Desktop layout
        <div className="hidden md:flex items-center space-x-2">
          <Button variant="ghost" onClick={openLoginModal}>
            {t("log_in")}
          </Button>
          <Button onClick={openRegisterModal}>{t("sign_up")}</Button>
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
