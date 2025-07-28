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
  const t = useTranslations("auth/reset");
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
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background/50 to-muted/30 p-4">
          <div className="max-w-md w-full space-y-6 text-center">
            <div className="space-y-2">
              <div className="flex justify-center">
                <AlertTriangle className="h-12 w-12 text-amber-500" />
              </div>
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-600 to-amber-500">
                Reset Link Required
              </h1>
              <p className="text-muted-foreground">
                To reset your password, you need to click on the reset link sent to your email.
              </p>
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mt-4">
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  If you don't have a reset link, you can request a new one below.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={handleRequestNewToken}
                className="w-full py-6 px-8 relative overflow-hidden btn-glow transition-all duration-300 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
              >
                <Key className="mr-2 h-4 w-4" />
                Request Password Reset
              </Button>
              
              <Link href="/">
                <Button 
                  variant="outline"
                  className="w-full py-6 px-8"
                >
                  Return to Home
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background/50 to-muted/30 p-4">
      <div className="max-w-md w-full">
        <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-8 shadow-2xl">
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="flex justify-center">
                <Key className="h-12 w-12 text-primary" />
              </div>
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
                Reset Password
              </h1>
              <p className="text-muted-foreground">
                Enter your new password below to reset your account password.
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
            Remember your password?{" "}
            <Button
              variant="link"
              onClick={handleLoginClick}
              className="p-0 h-auto font-medium text-primary hover:underline"
            >
              Sign in instead
            </Button>
          </p>
          
          <Link href="/">
            <Button 
              variant="link" 
              className="p-0 h-auto text-sm text-muted-foreground hover:text-primary"
            >
              Return to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
} 