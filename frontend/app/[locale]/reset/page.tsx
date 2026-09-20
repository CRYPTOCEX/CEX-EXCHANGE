"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { AuthModal } from "@/components/auth/auth-modal";
import ResetPasswordForm from "@/components/auth/reset-password-form";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Key } from "lucide-react";
import { useRouter, Link } from "@/i18n/routing";

export default function ResetPasswordPage() {
  const t = useTranslations("common");
  const searchParams = useSearchParams();
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    const resetToken = searchParams?.get('token');
    
    if (resetToken) {
      setToken(resetToken);
    } else {
      // No token provided, show error or redirect to forgot password
      setToken(null);
    }
  }, [searchParams]);

  const handleResetSuccess = () => {
    // Redirect to login or home after successful reset
    router.push('/login');
  };

  const handleLoginClick = () => {
    router.push('/login');
  };

  const handleRequestNewToken = () => {
    setShowAuthModal(true);
  };

  // If no token is provided
  if (token === null) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full space-y-6 text-center">
            <div className="space-y-2">
              <div className="flex justify-center">
                <AlertTriangle className="h-12 w-12 text-warning" />
              </div>
              <h1 className="text-3xl font-bold text-foreground">
                {t("reset_link_required")}
              </h1>
              <p className="text-muted-foreground">
                {t("to_reset_your_password_you_need")}
              </p>
              <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 mt-4">
                <p className="text-sm text-foreground">
                  {t("if_you_dont_have_a_reset")}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={handleRequestNewToken}
                className="w-full py-6 px-8 transition-colors bg-primary hover:bg-primary/90"
              >
                <Key className="mr-2 h-4 w-4" />
                {t("request_password_reset")}
              </Button>
              
              <Link href="/">
                <Button 
                  variant="outline"
                  className="w-full py-6 px-8"
                >
                  {t("return_to_home")}
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          initialView="forgot-password"
          onViewChange={() => {}}
        />
      </>
    );
  }

  // Show reset password form with token
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full">
        <div className="bg-card border border-border rounded-lg p-8">
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="flex justify-center">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Key className="h-7 w-7" />
                </span>
              </div>
              <h1 className="text-3xl font-bold text-foreground">
                {t("reset_password")}
              </h1>
              <p className="text-muted-foreground">
                {t("enter_your_new_password_below_to")}
              </p>
            </div>

            <ResetPasswordForm
              token={token}
              onSuccess={handleResetSuccess}
              onLoginClick={handleLoginClick}
              preserveToken={false}
            />
          </div>
        </div>

        <div className="text-center mt-6 space-y-2">
          <p className="text-sm text-muted-foreground">
            {t("remember_your_password")}{" "}
            <Button
              variant="link"
              onClick={handleLoginClick}
              className="p-0 h-auto font-medium text-primary hover:underline"
            >
              {t("sign_in_instead")}
            </Button>
          </p>
          
          <Link href="/">
            <Button 
              variant="link" 
              className="p-0 h-auto text-sm text-muted-foreground hover:text-primary"
            >
              {t("return_to_home")}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
} 