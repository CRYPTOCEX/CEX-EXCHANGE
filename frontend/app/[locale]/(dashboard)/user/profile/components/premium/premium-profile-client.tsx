"use client";

import { useEffect, Suspense, lazy, useState, useCallback } from "react";
import { m, AnimatePresence } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { Menu, X } from "lucide-react";
import { SkeletonBlock } from "@/components/ui/skeleton";
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

/**
 * Fallbacks that RESERVE, rather than spin.
 * ============================================================================
 *
 * Both of these stand in for a lazy chunk, so they are on screen every cold
 * navigation to /user/profile. Spinners reserve nothing: the sidebar fallback
 * was a centred `Loader2` in a box with no height at all — a `flex` column
 * child with no content collapses — so the 288px rail was the right WIDTH and
 * zero pixels tall until `premium-sidebar` arrived, and the content fallback
 * was centred in a `flex-1` that had no height to centre in.
 *
 * The classes below are copied from the real components, not invented:
 * `w-72 … h-screen sticky top-0` is `PremiumSidebar`'s own root, and the
 * content block matches the vertical rhythm of a tab panel. Sizing a
 * placeholder from the element it replaces is the only way the number stays
 * true when that element is restyled.
 */
const SidebarFallback = () => (
  <div className="w-72 bg-background border-r border-border/50 flex flex-col h-screen sticky top-0 p-4 gap-4">
    <SkeletonBlock className="h-5 w-40 rounded-sm" />
    <div className="flex items-center gap-3 py-2">
      <SkeletonBlock className="h-12 w-12 rounded-full" />
      <div className="flex-1 space-y-2">
        <SkeletonBlock className="h-4 w-28 rounded-sm" />
        <SkeletonBlock className="h-3 w-20 rounded-sm" />
      </div>
    </div>
    <div className="space-y-2">
      {Array.from({ length: 7 }).map((_, i) => (
        <SkeletonBlock key={i} className="h-10 w-full rounded-lg" />
      ))}
    </div>
  </div>
);

const ContentFallback = () => (
  <div className="space-y-4">
    <SkeletonBlock className="h-40 w-full rounded-2xl" />
    <SkeletonBlock className="h-40 w-full rounded-2xl" />
  </div>
);

/** The hero is `rounded-2xl` on a mesh-gradient card. Same corner, same box. */
const HeroFallback = () => (
  <SkeletonBlock className="h-48 w-full rounded-2xl" />
);

export function PremiumProfileClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab") || "dashboard";
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const {
    user,
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

  /**
   * ONE SHELL, BOTH STATES.
   * ==========================================================================
   *
   * What was removed: `if (isLoading) return <div className="flex h-screen
   * items-center justify-center bg-background"> … ring spinner … </div>`.
   *
   * This component is the entire /user/profile route. The swap therefore
   * replaced a two-column, full-height application shell — a 288px sticky
   * sidebar with seven navigation rows, a mobile header with a working menu
   * trigger, and a `max-w-6xl` content column — with a centred circle. None of
   * that chrome depends on the profile fetch: the nav labels are literals in
   * `premium-sidebar`, and the sidebar is already null-safe on `user` (it
   * reads `user?.firstName` throughout). It was simply not being rendered.
   *
   * The cost was not only the reflow. The sidebar and every tab are `lazy()`
   * chunks, and a component that is not rendered does not start downloading —
   * so the profile fetch and the code fetch ran in SERIES. Rendering the shell
   * immediately starts the sidebar chunk during the same window the profile is
   * in flight, instead of after it.
   *
   * `user` stays null for that window, and the two heavy children already
   * return null in that case, so the pending state is the chrome plus the
   * shaped fallbacks above — which is what `HeroFallback`/`ContentFallback`
   * are for below.
   */
  const renderTabContent = () => {
    /* The user has not arrived: the tab bodies all bail out on a null user, so
       rendering them would collapse the content column to nothing and then
       jump. Reserve the column instead. This is keyed on the DATA, not on a
       lazy boundary — the Suspense fallback below covers the other wait. */
    if (!user) {
      return <ContentFallback />;
    }

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
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Suspense fallback={<SidebarFallback />}>
          <PremiumSidebar />
        </Suspense>
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-4 h-16">
          {/* The ground here is `bg-background/95`, not a `bg-primary` fill, so
              the ink is --foreground. As --primary-foreground (white in light
              mode) this title was white-on-white on every light theme.

              `<h2>`, NOT `<h1>`. This bar is `lg:hidden` chrome, and the page's
              real title — the account's own name, drawn by `ProfileHero` — is
              on screen at every width. As an `<h1>` this was one of THREE the
              browser measured on /en/user/profile, and the only one a desktop
              reader could not even see. Same classes, so the bar is
              unchanged. */}
          <h2 className="text-lg font-semibold text-foreground">Profile</h2>
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="p-0 w-72 bg-background border-border"
            >
              <Suspense fallback={<SidebarFallback />}>
                <PremiumSidebar />
              </Suspense>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-screen pt-header lg:pt-0">
        <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto">
          <AnimatePresence mode="wait">
            <m.div
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
                    <Suspense fallback={<HeroFallback />}>
                      {/* `user ? … : <HeroFallback/>` and not just the hero:
                          `ProfileHero` opens with `if (!user) return null`, so
                          during the profile fetch this `mb-8` wrapper was 32px
                          tall and then became ~250px, pushing the whole tab
                          body down at the moment the user looked at it. The
                          fallback is the same box the Suspense boundary uses,
                          so the two waits are indistinguishable on screen. */}
                      {user ? (
                        <ProfileHero
                          onEditProfile={() => handleTabChange("personal")}
                          onSettings={() => handleTabChange("security")}
                          currentTab={tabParam}
                        />
                      ) : (
                        <HeroFallback />
                      )}
                    </Suspense>
                  </div>
                )}

              {/* Tab Content */}
              {renderTabContent()}
            </m.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Background gradient effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-warning/[0.02] rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-primary/[0.02] rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />
      </div>
    </div>
  );
}

export default PremiumProfileClient;
