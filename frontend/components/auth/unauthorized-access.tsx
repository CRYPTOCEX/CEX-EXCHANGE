"use client";

import { useState } from "react";
import { Shield, Lock, AlertTriangle, ArrowRight, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthModal } from "./auth-modal";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

interface UnauthorizedAccessProps {
  title?: string;
  description?: string;
  returnPath?: string;
}

export function UnauthorizedAccess({ 
  title, 
  description, 
  returnPath 
}: UnauthorizedAccessProps) {
  const t = useTranslations("components/auth/unauthorized-access");
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const handleLoginSuccess = () => {
    // Modal will handle the redirect/cleanup
    setIsAuthModalOpen(false);
    // Force a page reload to check authentication status
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <Card className="border-2 border-border/50 shadow-2xl">
          <CardHeader className="text-center space-y-4 pb-4">
            <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
              <Shield className="w-8 h-8 text-destructive" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl font-bold text-foreground">
                {title || t("access_restricted")}
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                {description || t("you_need_to_be_authenticated_to_access_this_area")}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Security notice */}
            <div className="bg-muted/50 border border-border/50 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    {t("authentication_required")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("this_area_requires_proper")}
                  </p>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-3">
              <Button 
                onClick={() => setIsAuthModalOpen(true)}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                size="lg"
              >
                <Lock className="w-4 h-4 mr-2" />
                {t("sign_in_to_continue")}
              </Button>

              <Link href="/">
                <Button 
                  variant="outline" 
                  className="w-full"
                  size="lg"
                >
                  <Home className="w-4 h-4 mr-2" />
                  {t("go_to_homepage")}
                </Button>
              </Link>
            </div>

            {/* Additional info */}
            <div className="pt-4 border-t border-border/50">
              <div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <Shield className="w-3 h-3" />
                  <span>{t("secure_access")}</span>
                </div>
                <div className="w-px h-3 bg-border"></div>
                <div className="flex items-center space-x-1">
                  <Lock className="w-3 h-3" />
                  <span>{t("protected_area")}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialView="login"
        returnTo={returnPath}
      />
    </div>
  );
} 