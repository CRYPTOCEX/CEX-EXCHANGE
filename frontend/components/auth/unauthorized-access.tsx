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
  /**
   * WHY the caller is being refused.
   *
   * "unauthenticated" is the original behaviour: no session, sign in.
   *
   * "unpermitted" is a signed-in user whose ROLE grants no admin permission —
   * and every word of the unauthenticated copy is wrong for them. They are
   * authenticated; the only button offered (Sign in) cannot change the outcome;
   * and the page gives no hint that the fix lives in Admin -> Roles. The
   * observed cost of that wording is an operator concluding their brand-new
   * admin account is broken, deleting it, and re-registering until the signup
   * rate limiter locks the door — with the actual cause, a role holding zero
   * permissions, never mentioned once.
   *
   * The most common way to arrive here: a role created on demand (the demo-mode
   * signup path, or by hand in Admin -> Roles) starts with NO permissions.
   * Nothing seeds them.
   */
  reason?: "unauthenticated" | "unpermitted";
  /** The signed-in user's role name, shown so the refusal is diagnosable. */
  roleName?: string;
}

export function UnauthorizedAccess({
  title,
  description,
  returnPath,
  reason = "unauthenticated",
  roleName,
}: UnauthorizedAccessProps) {
  const t = useTranslations("components_auth");
  const tCommon = useTranslations("common");
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const unpermitted = reason === "unpermitted";

  const handleLoginSuccess = () => {
    // Modal will handle the redirect/cleanup
    setIsAuthModalOpen(false);
    // Force a page reload to check authentication status
    window.location.reload();
  };

  /*
   * `t.has` before `t`, because these four keys are NEW.
   *
   * A missing key renders as the key itself (see createTranslationFunction in
   * i18n/context.tsx), and the repo ships ~100 locale files. Adding the keys to
   * en.json alone would print "you_are_signed_in_but_this_role" verbatim to
   * every non-English visitor. Falling back to the English sentence keeps the
   * page readable everywhere until the translation pass catches up.
   */
  const tr = (key: string, english: string) =>
    t.has(key) ? t(key) : english;

  const headline = unpermitted
    ? tr("permission_required", "Permission Required")
    : t("access_restricted");

  const blurb = unpermitted
    ? tr(
        "your_role_does_not_grant_admin_access",
        "You are signed in, but your role does not grant access to this area."
      )
    : t("you_need_to_be_authenticated_to_access_this_area");

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="relative z-10 w-full max-w-md">
        <Card className="border-border">
          <CardHeader className="text-center space-y-4 pb-4">
            <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-lg grid place-items-center">
              <Shield className="w-8 h-8 text-destructive" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl font-semibold text-foreground">
                {title || headline}
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                {description || blurb}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Why this happened. The unpermitted branch names the role and the
                screen that fixes it — signing in again cannot. */}
            <div className="bg-surface-2 border border-border rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-warning mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    {unpermitted
                      ? roleName
                        ? `${tr("signed_in_as_role", "Signed in with the role")}: ${roleName}`
                        : tr("permission_required", "Permission Required")
                      : tCommon("authentication_required")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {unpermitted
                      ? tr(
                          "ask_a_super_admin_to_grant_permissions",
                          "A newly created role holds no permissions until they are granted. Ask a Super Admin to tick the permissions this role needs under Admin → Roles."
                        )
                      : t("this_area_requires_proper")}
                  </p>
                </div>
              </div>
            </div>

            {/* Action buttons. "Sign in" is hidden for an unpermitted caller:
                they already are signed in, and offering it is what made a
                permissions problem look like a broken login. */}
            <div className="space-y-3">
              {!unpermitted && (
                <Button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  size="lg"
                >
                  <Lock className="w-4 h-4 mr-2" />
                  {tCommon("sign_in_to_continue")}
                </Button>
              )}

              <Link href="/">
                <Button
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  <Home className="w-4 h-4 mr-2" />
                  {tCommon("go_to_homepage")}
                </Button>
              </Link>
            </div>

            {/* Additional info */}
            <div className="pt-4 border-t border-border">
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