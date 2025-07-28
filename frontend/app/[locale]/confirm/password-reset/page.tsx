"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/routing";

export default function ConfirmPasswordResetRedirect() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    // Get the token from the URL
    const token = searchParams?.get('token');
    
    // Redirect to the correct reset page with the token
    if (token) {
      router.replace(`/reset?token=${token}`);
    } else {
      router.replace('/reset');
    }
  }, [searchParams, router]);

  // Show loading while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background/50 to-muted/30 p-4">
      <div className="text-center">
        <div className="h-12 w-12 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-muted-foreground">Redirecting...</p>
      </div>
    </div>
  );
} 