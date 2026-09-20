"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { AuthModal } from "@/components/auth/auth-modal";
import { $fetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter, Link, getLocales } from "@/i18n/routing";

/**
 * Where to go after signing in.
 *
 * `?return=` is already part of this app's contract — `lib/api.ts` builds
 * `/{locale}/login?return={pathname + search}` whenever a request comes back
 * with an expired session — and this page ignored it, sending everyone to `/`
 * unconditionally. So the platform's own "your session expired" redirect threw
 * away the page it interrupted, and every surface that offers a sign-in link
 * mid-task (a trade room with a payment window running, a half-filled offer)
 * could only promise something it did not deliver.
 *
 * ONLY SAME-ORIGIN PATHS. A `return` value is attacker-controllable — it
 * arrives in a URL anyone can send — so an unvalidated one turns the sign-in
 * page into an open redirect, which is the classic way a credential-phishing
 * link gets to wear a legitimate domain. Everything below is refused:
 *
 *   //evil.example        protocol-relative; the browser reads it as a host
 *   https://evil.example  absolute
 *   /\evil.example        backslash, which several parsers fold to `/`
 *   javascript:…          scheme
 *
 * A single leading `/` followed by something that is not `/` or `\` is the only
 * accepted shape, and anything else falls back to the home page rather than
 * failing — a person who has just signed in should land somewhere, always.
 */
function safeReturnTo(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let value = raw;
  try {
    value = decodeURIComponent(raw);
  } catch {
    /* a malformed escape is not a path we are going to honour anyway */
    return null;
  }
  value = value.trim();
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//") || value.startsWith("/\\")) return null;
  if (/^\/[a-z][a-z0-9+.-]*:/i.test(value)) return null;
  return value;
}

/**
 * Drop a leading `/{locale}`, because `router` is next-intl's and adds one.
 *
 * `lib/api.ts` builds its return value from `window.location.pathname`, which
 * already carries the locale, so pushing it unchanged gives `/en/en/p2p/...`.
 * Matched against the CONFIGURED locale list rather than a `/[a-z]{2}/` shape:
 * that pattern would also eat the first segment of any two-letter route, and
 * silently send somebody to the wrong page.
 */
function stripLocalePrefix(path: string): string {
  const [, first, ...rest] = path.split("/");
  if (!first || !getLocales().includes(first)) return path;
  const remainder = `/${rest.join("/")}`;
  return remainder === "/" ? "/" : remainder;
}

export default function LoginPage() {
  const t = useTranslations("common");
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'success' | 'error' | 'none'>('none');
  const [verificationMessage, setVerificationMessage] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const token = searchParams?.get('token');
    
    if (token) {
      // Handle email verification token
      handleEmailVerification(token);
    } else {
      // Show login modal for regular login
      setIsModalOpen(true);
    }
  }, [searchParams]);

  const handleEmailVerification = async (token: string) => {
    setIsVerifying(true);
    setVerificationStatus('pending');

    try {
      const result = await $fetch({
        url: '/api/auth/verify/email',
        method: 'POST',
        body: { token },
        silent: true,
      });

      if (result.data?.message) {
        setVerificationStatus('success');
        setVerificationMessage(result.data.message);
        toast({
          title: t("email_verified_successfully"),
          description: t("your_email_has_been_verified_you"),
        });

        // Redirect to dashboard after 3 seconds
        setTimeout(() => {
          router.push('/');
        }, 3000);
      } else {
        setVerificationStatus('error');
        setVerificationMessage(result.error || 'Email verification failed');
        toast({
          title: t("verification_failed"),
          description: result.error || t("invalid_or_expired_verification_token"),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Email verification error:', error);
      setVerificationStatus('error');
      setVerificationMessage('An unexpected error occurred during verification');
      toast({
        title: t("verification_error"),
        description: t("an_unexpected_error_occurred_please_try_again"),
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleModalClose = () => {
    // Back to where they were, when we were told — see `safeReturnTo`. Home is
    // the fallback, not the rule. This fires both on a successful sign-in and
    // on dismissing the modal, and returning to the interrupted page is the
    // right answer for both: an unauthenticated visitor lands back on a page
    // that will ask them again, which is where they chose to be.
    setIsModalOpen(false);
    const back = safeReturnTo(searchParams?.get('return'));
    router.push(back ? stripLocalePrefix(back) : '/');
  };

  const handleResendVerification = async () => {
    if (!userEmail) {
      toast({
        title: t("email_required"),
        description: t("please_provide_your_email_address_to"),
        variant: "destructive",
      });
      return;
    }

    setIsResending(true);

    try {
      const result = await $fetch({
        url: '/api/auth/verify/resend',
        method: 'POST',
        body: { email: userEmail },
        silent: true,
      });

      if (result.data?.message) {
        toast({
          title: t("verification_email_sent"),
          description: result.data.message,
        });
      } else {
        toast({
          title: t("failed_to_send"),
          description: result.error || t("failed_to_send_verification_email"),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Resend verification error:', error);
      toast({
        title: t("error"),
        description: t("an_unexpected_error_occurred_please_try_again"),
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  // Email verification result page
  if (verificationStatus !== 'none') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full space-y-6 text-center">
          <div className="space-y-2">
            {isVerifying ? (
              <>
                <div className="flex justify-center">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
                <h1 className="text-3xl font-bold text-foreground">
                  {t("verifying_email")}
                </h1>
                <p className="text-muted-foreground">
                  {t("please_wait_while_we_verify_your")}…
                </p>
              </>
            ) : verificationStatus === 'success' ? (
              <>
                <div className="flex justify-center">
                  <CheckCircle2 className="h-12 w-12 text-success" />
                </div>
                <h1 className="text-3xl font-bold text-foreground">
                  {t("email_verified")}
                </h1>
                <p className="text-muted-foreground">
                  {verificationMessage}
                </p>
                <div className="bg-success/10 border border-success/20 rounded-lg p-4 mt-4">
                  <p className="text-sm text-foreground">
                    {t("you_will_be_redirected_to_the")}…
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-center">
                  <AlertTriangle className="h-12 w-12 text-destructive" />
                </div>
                <h1 className="text-3xl font-bold text-foreground">
                  {t("verification_failed")}
                </h1>
                <p className="text-muted-foreground">
                  {verificationMessage}
                </p>
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mt-4">
                  <p className="text-sm text-foreground">
                    {t("the_verification_link_may_have_expired")} {t("please_try_requesting_a_new_one")}
                  </p>
                  <div className="mt-3">
                    <Input
                      type="email"
                      placeholder={t("enter_your_email_address")}
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      className="bg-card border-destructive/40 text-foreground placeholder:text-muted-foreground focus-visible:ring-ring"
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          {!isVerifying && (
            <div className="space-y-3">
              <Button 
                onClick={() => router.push('/')}
                className="w-full py-6 px-8 transition-colors bg-primary hover:bg-primary/90"
              >
                {t("go_to_home")}
              </Button>
              
              {verificationStatus === 'error' && (
                <>
                  <Button 
                    variant="outline"
                    onClick={() => setIsModalOpen(true)}
                    className="w-full py-6 px-8"
                  >
                    {t("try_login_instead")}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={handleResendVerification}
                    className="w-full py-6 px-8"
                    disabled={isResending}
                  >
                    {isResending ? `${t("sending")}…` : t("resend_verification_email")}
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Regular login modal
  return (
    <>
      <AuthModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        initialView="login"
        onViewChange={() => {}}
      />
      
      {/* Background for modal */}
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-muted-foreground">
            {isModalOpen ? t("please_log_in_to_continue") : t("login")}
          </h1>
          <p className="text-muted-foreground">
            {isModalOpen ? t("fill_in_your_credentials_to_access_your_account") : t("click_below_to_open_the_login_form")}
          </p>
          <div className="space-y-3">
            {!isModalOpen && (
              <Button 
                onClick={() => setIsModalOpen(true)}
                className="px-8 py-3 bg-primary hover:bg-primary/90"
              >
                {t("open_login_form")}
              </Button>
            )}
            <Link href="/">
              <Button variant="outline">
                {t("return_to_home")}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
} 