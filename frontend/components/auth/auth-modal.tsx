"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useSearchParams } from "next/navigation";
import { Lock, Shield, CheckCircle2, X } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";

import LoginForm from "@/components/auth/login-form";
import RegisterForm from "@/components/auth/register-form";
import RegisterSuccess from "@/components/auth/register-success";
import ForgotPasswordForm from "@/components/auth/forgot-password-form";
import ResetPasswordForm from "@/components/auth/reset-password-form";
import WalletLoginForm from "@/components/auth/wallet-login-form";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { cleanupAuthFalseParam, hasAuthFalseParam } from "@/utils/url-cleanup";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialView:
    | "login"
    | "register"
    | "register-success"
    | "forgot-password"
    | "reset-password"
    | "wallet-login";
  onViewChange?: (view: string) => void;
  returnTo?: string | null;

}

export function AuthModal({
  isOpen,
  onClose,
  initialView,
  onViewChange,
  returnTo,
}: AuthModalProps) {
  const t = useTranslations("components/auth/auth-modal");
  const [view, setView] = useState<
    "login" | "register" | "register-success" | "forgot-password" | "reset-password" | "wallet-login"
  >(initialView);
  const searchParams = useSearchParams();
  const router = useRouter();
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [animateContent, setAnimateContent] = useState(true);
  const [registrationData, setRegistrationData] = useState<{
    email: string;
    needsEmailVerification: boolean;
  } | null>(null);

  useEffect(() => {
    try {
      const token = searchParams?.get("token");
      if (token) {
        setResetToken(token);
        setView("reset-password");
        if (onViewChange) {
          onViewChange("reset-password");
        }
      }
    } catch (error) {
      console.error("Error checking for reset token:", error);
      setError("Failed to process reset token from URL");
    }
  }, [searchParams, onViewChange]);

  useEffect(() => {
    try {
      setView(initialView);
    } catch (error) {
      console.error("Error in AuthModal useEffect:", error);
      setError("Failed to update view");
    }
  }, [initialView]);

  useEffect(() => {
    setAnimateContent(false);
    const timer = setTimeout(() => setAnimateContent(true), 50);
    return () => clearTimeout(timer);
  }, [view]);

  const handleViewChange = (newView: string) => {
    try {
      setAnimateContent(false);
      setTimeout(() => {
        setView(
          newView as
            | "login"
            | "register"
            | "register-success"
            | "forgot-password"
            | "reset-password"
            | "wallet-login"
        );
        if (onViewChange) {
          onViewChange(newView);
        }
        setAnimateContent(true);
      }, 150);
    } catch (error) {
      console.error("Error in handleViewChange:", error);
      setError("Failed to change view");
    }
  };

  const handleSuccess = () => {
    try {
      // Clean up auth=false and return parameters from URL after successful login
      if (hasAuthFalseParam()) {
        cleanupAuthFalseParam();
      }

      if (returnTo && returnTo.startsWith("/")) {
        // Check if returnTo already contains locale, if so, strip it
        const locales = process.env.NEXT_PUBLIC_LANGUAGES?.split(", ") || [];
        let cleanPath = returnTo;
        
        // Remove locale prefix if present (e.g., /en/admin -> /admin)
        const pathSegments = returnTo.split("/").filter(Boolean);
        if (pathSegments.length > 0 && locales.includes(pathSegments[0])) {
          cleanPath = "/" + pathSegments.slice(1).join("/");
        }
        
        router.push(cleanPath);
        onClose(); // Optionally close the modal immediately after navigation
      } else if (view === "reset-password" && resetToken) {
        const newUrl = window.location.pathname;
        router.replace(newUrl);
        onClose();
      } else {
        onClose();
        // No need to reload the page - the UI will update through the user state
      }
    } catch (error) {
      console.error("Error in handleSuccess:", error);
      setError("Failed to process successful action");
      if (view !== "forgot-password") {
        onClose();
      }
    }
  };

  const handleClose = () => {
    try {
      onClose();
    } catch (error) {
      console.error("Error in handleClose:", error);
      onClose();
    }
  };

  const handleLoginClick = () => {
    try {
      handleViewChange("login");
    } catch (error) {
      console.error("Error in handleLoginClick:", error);
      setError("Failed to return to login");
    }
  };

  const handleTokenSubmit = (token: string) => {
    try {
      setResetToken(token);
      handleViewChange("reset-password");
    } catch (error) {
      console.error("Error in handleTokenSubmit:", error);
      setError("Failed to process token");
    }
  };

  const handleRegistrationSuccess = (email: string, needsEmailVerification: boolean) => {
    try {
      setRegistrationData({ email, needsEmailVerification });
      handleViewChange("register-success");
    } catch (error) {
      console.error("Error in handleRegistrationSuccess:", error);
      setError("Failed to process registration success");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      {/* Custom backdrop overlay with blue tint */}
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 bg-gradient-to-br from-blue-900/20 via-slate-900/40 to-blue-800/20" />
      <DialogContent className="sm:max-w-xl p-0 border-none shadow-2xl rounded-xl w-[95vw] sm:w-full max-h-[90vh] overflow-hidden bg-gradient-to-b from-background to-background/95 backdrop-blur-sm">
        {/* ---- Accessibility: DialogTitle and DialogDescription ---- */}
        <DialogTitle>
          <span className="sr-only">Authentication</span>
        </DialogTitle>
        <DialogDescription>
          <span className="sr-only">
            Sign in or create an account securely.
          </span>
        </DialogDescription>
        {/* --------------------------------------------------------- */}

        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl"></div>
        </div>
        <DialogPrimitive.Close className="hidden absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>

        {/* Error display */}
        {error && (
          <div
            className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg mx-6 mt-6 relative z-10"
            role="alert"
          >
            <div className="flex items-center">
              <Shield className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="block sm:inline text-sm">{error}</span>
            </div>
            <button
              className="absolute top-0 bottom-0 right-0 px-4 py-3 text-destructive/70 hover:text-destructive transition-colors"
              onClick={() => setError(null)}
            >
              <span className="sr-only">Dismiss</span>
              <span aria-hidden="true">×</span>
            </button>
          </div>
        )}

        {/* Main content */}
        <div
          className={`max-h-[90vh] pb-8 overflow-y-auto scrollbar-hide auth-modal-content ${animateContent ? "opacity-100" : "opacity-0"}`}
        >
          {view === "forgot-password" ? (
            <div className="p-8">
              <ForgotPasswordForm
                onSuccess={handleSuccess}
                onLoginClick={handleLoginClick}
                onTokenSubmit={handleTokenSubmit}
              />
            </div>
          ) : view === "reset-password" ? (
            <div className="p-8">
              <ResetPasswordForm
                token={resetToken || ""}
                onSuccess={handleSuccess}
                onLoginClick={handleLoginClick}
                preserveToken={true}
              />
            </div>
          ) : view === "wallet-login" ? (
            <div className="p-8">
              <WalletLoginForm
                onSuccess={handleSuccess}
                onCancel={handleLoginClick}
              />
            </div>
          ) : (
            <div className="p-8">
              {view === "login" ? (
                <LoginForm
                  onSuccess={handleSuccess}
                  onRegisterClick={() => handleViewChange("register")}
                  onForgotPasswordClick={() =>
                    handleViewChange("forgot-password")
                  }
                  onWalletLoginClick={() => handleViewChange("wallet-login")}
                />
              ) : view === "register" ? (
                <RegisterForm
                  onSuccess={handleSuccess}
                  onRegistrationSuccess={handleRegistrationSuccess}
                  onLoginClick={handleLoginClick}
                />
              ) : (
                <RegisterSuccess 
                  email={registrationData?.email || ""}
                  needsEmailVerification={registrationData?.needsEmailVerification || false}
                  onLoginClick={handleLoginClick}
                  onClose={handleClose}
                />
              )}
            </div>
          )}

          {(view === "login" || view === "register") && (
            <div className="px-8 pb-8 pt-2">
              <div className="flex flex-col items-center justify-center space-y-3 text-center">
                <div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                    <Lock className="h-4 w-4 text-primary" />
                  </div>
                  <span>{t("secure_authentication")}</span>
                  <div className="w-px h-4 bg-border"></div>
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                    <Shield className="h-4 w-4 text-primary" />
                  </div>
                  <span>{t("data_protection")}</span>
                  <div className="w-px h-4 bg-border"></div>
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  </div>
                  <span>{t("verified_security")}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AuthModal;
