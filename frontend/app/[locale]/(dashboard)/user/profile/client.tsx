"use client";

import { useEffect, Suspense, lazy, useState } from "react";
import { motion } from "framer-motion";
import { useUserStore } from "@/store/user";
import { useRouter } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { Loader2, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

// Import premium components
const PremiumProfileClient = lazy(() =>
  import("./components/premium/premium-profile-client").then((mod) => ({
    default: mod.PremiumProfileClient,
  }))
);

// Loading fallback with premium styling
function ProfileLoadingFallback() {
  return (
    <div className="flex h-screen items-center justify-center bg-zinc-950">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="h-16 w-16 rounded-full border-2 border-amber-500/20" />
          <div className="absolute inset-0 h-16 w-16 rounded-full border-2 border-transparent border-t-amber-500 animate-spin" />
        </div>
        <p className="text-zinc-500">Loading your profile...</p>
      </div>
    </div>
  );
}

export function UserProfileClient() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");

  const {
    user,
    setActiveTab,
    calculateSecurityScore,
    calculateProfileCompletion,
  } = useUserStore();

  // Set the active tab based on URL query parameter
  useEffect(() => {
    if (
      tabParam &&
      [
        "dashboard",
        "personal",
        "security",
        "notifications",
        "wallet",
        "api",
        "phone-verification",
      ].includes(tabParam)
    ) {
      setActiveTab(tabParam);
    }
  }, [tabParam, setActiveTab]);

  // Fetch security data when component mounts
  useEffect(() => {
    if (user) {
      const timer = setTimeout(() => {
        calculateSecurityScore();
        calculateProfileCompletion();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [user, calculateSecurityScore, calculateProfileCompletion]);

  return (
    <Suspense fallback={<ProfileLoadingFallback />}>
      <PremiumProfileClient />
    </Suspense>
  );
}
