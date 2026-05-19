"use client";

import { useEffect, Suspense, lazy, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { Loader2, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserStore } from "@/store/user";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

// Lazy load components
const ProfileHero = lazy(() =>
  import("./profile-hero").then((mod) => ({ default: mod.ProfileHero }))
);
const PremiumSidebar = lazy(() =>
  import("./premium-sidebar").then((mod) => ({ default: mod.PremiumSidebar }))
);
const DashboardTab = lazy(() =>
  import("./tabs/dashboard-tab").then((mod) => ({ default: mod.DashboardTab }))
);
const PersonalInfoTab = lazy(() =>
  import("./tabs/personal-info-tab").then((mod) => ({
    default: mod.PersonalInfoTab,
  }))
);
const SecurityTab = lazy(() =>
  import("./tabs/security-tab").then((mod) => ({ default: mod.SecurityTab }))
);

// Keep existing tabs for wallet, api, and notifications
const WalletTab = lazy(() =>
  import("../tabs/wallet-tab").then((mod) => ({ default: mod.WalletTab }))
);
const ApiKeysTab = lazy(() =>
  import("../tabs/api-keys-tab").then((mod) => ({ default: mod.ApiKeysTab }))
);
const NotificationsTab = lazy(() =>
  import("../tabs/notifications-tab").then((mod) => ({
    default: mod.NotificationsTab,
  }))
);
const PhoneVerificationTab = lazy(() =>
  import("../tabs/phone-verification-tab").then((mod) => ({
    default: mod.PhoneVerificationTab,
  }))
);
const TwoFactorSetupFlow = lazy(() =>
  import("../two-factor-setup-flow").then((mod) => ({
    default: mod.TwoFactorSetupFlow,
  }))
);

// Loading fallbacks
const SidebarFallback = () => (
  <div className="w-72 bg-zinc-950 border-r border-zinc-800/50 flex items-center justify-center">
    <Loader2 className="h-6 w-6 animate-spin text-amber-500/60" />
  </div>
);

const ContentFallback = () => (
  <div className="flex-1 flex items-center justify-center bg-zinc-950">
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <div className="h-12 w-12 rounded-full border-2 border-amber-500/20" />
        <div className="absolute inset-0 h-12 w-12 rounded-full border-2 border-transparent border-t-amber-500 animate-spin" />
      </div>
      <p className="text-zinc-500 text-sm">Loading...</p>
    </div>
  </div>
);

export function PremiumProfileClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab") || "dashboard";
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const {
    user,
    isLoading,
    setActiveTab,
    calculateSecurityScore,
    calculateProfileCompletion,
    showTwoFactorSetup,
    setShowTwoFactorSetup,
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

  // Calculate scores on mount
  useEffect(() => {
    if (user) {
      const timer = setTimeout(() => {
        calculateSecurityScore();
        calculateProfileCompletion();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [user, calculateSecurityScore, calculateProfileCompletion]);

  // Close mobile menu when tab changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [tabParam]);

  const handleTabChange = useCallback(
    (tab: string) => {
      router.push(`/user/profile?tab=${tab}`);
    },
    [router]
  );

  const startTwoFactorSetup = useCallback(() => {
    setShowTwoFactorSetup(true);
  }, [setShowTwoFactorSetup]);

  if (isLoading) {
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

  const renderTabContent = () => {
    // If 2FA setup is active, show that instead
    if (showTwoFactorSetup) {
      return (
        <Suspense fallback={<ContentFallback />}>
          <TwoFactorSetupFlow
            onCancel={() => setShowTwoFactorSetup(false)}
            onComplete={() => setShowTwoFactorSetup(false)}
          />
        </Suspense>
      );
    }

    switch (tabParam) {
      case "dashboard":
        return (
          <Suspense fallback={<ContentFallback />}>
            <DashboardTab onTabChange={handleTabChange} />
          </Suspense>
        );
      case "personal":
        return (
          <Suspense fallback={<ContentFallback />}>
            <PersonalInfoTab />
          </Suspense>
        );
      case "security":
        return (
          <Suspense fallback={<ContentFallback />}>
            <SecurityTab startTwoFactorSetup={startTwoFactorSetup} />
          </Suspense>
        );
      case "notifications":
        return (
          <Suspense fallback={<ContentFallback />}>
            <NotificationsTab />
          </Suspense>
        );
      case "wallet":
        return (
          <Suspense fallback={<ContentFallback />}>
            <WalletTab />
          </Suspense>
        );
      case "api":
        return (
          <Suspense fallback={<ContentFallback />}>
            <ApiKeysTab />
          </Suspense>
        );
      case "phone-verification":
        return (
          <Suspense fallback={<ContentFallback />}>
            <PhoneVerificationTab />
          </Suspense>
        );
      default:
        return (
          <Suspense fallback={<ContentFallback />}>
            <DashboardTab onTabChange={handleTabChange} />
          </Suspense>
        );
    }
  };

  return (
    <div className="flex min-h-screen bg-zinc-950">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Suspense fallback={<SidebarFallback />}>
          <PremiumSidebar />
        </Suspense>
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-zinc-950/95 backdrop-blur-xl border-b border-zinc-800/50">
        <div className="flex items-center justify-between px-4 h-16">
          <h1 className="text-lg font-semibold text-white">Profile</h1>
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-zinc-400 hover:text-white"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="p-0 w-72 bg-zinc-950 border-zinc-800"
            >
              <Suspense fallback={<SidebarFallback />}>
                <PremiumSidebar />
              </Suspense>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-screen pt-16 lg:pt-0">
        <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={showTwoFactorSetup ? "2fa" : tabParam}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* Show Hero only on dashboard, personal, and security tabs */}
              {!showTwoFactorSetup &&
                ["dashboard", "personal", "security"].includes(tabParam) && (
                  <div className="mb-8">
                    <Suspense fallback={<div className="h-48 bg-zinc-900/50 rounded-2xl animate-pulse" />}>
                      <ProfileHero
                        onEditProfile={() => handleTabChange("personal")}
                        onSettings={() => handleTabChange("security")}
                        currentTab={tabParam}
                      />
                    </Suspense>
                  </div>
                )}

              {/* Tab Content */}
              {renderTabContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Background gradient effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-amber-500/[0.02] rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-violet-500/[0.02] rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />
      </div>
    </div>
  );
}

export default PremiumProfileClient;
