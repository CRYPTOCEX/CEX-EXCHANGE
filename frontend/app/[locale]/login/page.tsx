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
import { useRouter, Link } from "@/i18n/routing";

export default function LoginPage() {
  const t = useTranslations("auth/login");
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
          title: "Email Verified Successfully",
          description: "Your email has been verified. You can now access all features.",
        });

        // Redirect to dashboard after 3 seconds
        setTimeout(() => {
          router.push('/');
        }, 3000);
      } else {
        setVerificationStatus('error');
        setVerificationMessage(result.error || 'Email verification failed');
        toast({
          title: "Verification Failed",
          description: result.error || "Invalid or expired verification token.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Email verification error:', error);
      setVerificationStatus('error');
      setVerificationMessage('An unexpected error occurred during verification');
      toast({
        title: "Verification Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleModalClose = () => {
    // Always redirect to home after modal closes
    // This will be called after successful login or when user closes modal
    setIsModalOpen(false);
    router.push('/');
  };

  const handleResendVerification = async () => {
    if (!userEmail) {
      toast({
        title: "Email Required",
        description: "Please provide your email address to resend verification.",
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
          title: "Verification Email Sent",
          description: result.data.message,
        });
      } else {
        toast({
          title: "Failed to Send",
          description: result.error || "Failed to send verification email.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Resend verification error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  // Email verification result page
  if (verificationStatus !== 'none') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background/50 to-muted/30 p-4">
        <div className="max-w-md w-full space-y-6 text-center">
          <div className="space-y-2">
            {isVerifying ? (
              <>
                <div className="flex justify-center">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
                  Verifying Email
                </h1>
                <p className="text-muted-foreground">
                  Please wait while we verify your email address...
                </p>
              </>
            ) : verificationStatus === 'success' ? (
              <>
                <div className="flex justify-center">
                  <CheckCircle2 className="h-12 w-12 text-green-500" />
                </div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-green-500">
                  Email Verified!
                </h1>
                <p className="text-muted-foreground">
                  {verificationMessage}
                </p>
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mt-4">
                  <p className="text-sm text-green-700 dark:text-green-300">
                    You will be redirected to the home page in a few seconds...
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-center">
                  <AlertTriangle className="h-12 w-12 text-red-500" />
                </div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-600 to-red-500">
                  Verification Failed
                </h1>
                <p className="text-muted-foreground">
                  {verificationMessage}
                </p>
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mt-4">
                  <p className="text-sm text-red-700 dark:text-red-300">
                    The verification link may have expired or is invalid. Please try requesting a new one.
                  </p>
                  <div className="mt-3">
                    <Input
                      type="email"
                      placeholder="Enter your email address"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      className="bg-white dark:bg-red-900/10 border-red-300 dark:border-red-700 text-red-900 dark:text-red-100 placeholder-red-500 dark:placeholder-red-400 focus:ring-red-500"
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
                className="w-full py-6 px-8 relative overflow-hidden btn-glow transition-all duration-300 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
              >
                Go to Home
              </Button>
              
              {verificationStatus === 'error' && (
                <>
                  <Button 
                    variant="outline"
                    onClick={() => setIsModalOpen(true)}
                    className="w-full py-6 px-8"
                  >
                    Try Login Instead
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={handleResendVerification}
                    className="w-full py-6 px-8"
                    disabled={isResending}
                  >
                    {isResending ? "Sending..." : "Resend Verification Email"}
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background/50 to-muted/30">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-muted-foreground">
            {isModalOpen ? 'Please log in to continue' : 'Login'}
          </h1>
          <p className="text-muted-foreground">
            {isModalOpen ? 'Fill in your credentials to access your account' : 'Click below to open the login form'}
          </p>
          <div className="space-y-3">
            {!isModalOpen && (
              <Button 
                onClick={() => setIsModalOpen(true)}
                className="px-8 py-3 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
              >
                Open Login Form
              </Button>
            )}
            <Link href="/">
              <Button variant="outline">
                Return to Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
} 