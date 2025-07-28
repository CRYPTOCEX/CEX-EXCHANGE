"use client";

import { useState, useEffect, lazy, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { TwoFactorSetupFlow } from "./two-factor-setup-flow";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "@/i18n/routing";
import { useUserStore } from "@/store/user";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

// Lazy load tab components
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
const WalletTab = lazy(() =>
  import("./tabs/wallet-tab").then((mod) => ({ default: mod.WalletTab }))
);
const ApiKeysTab = lazy(() =>
  import("./tabs/api-keys-tab").then((mod) => ({ default: mod.ApiKeysTab }))
);
const NotificationsTab = lazy(() =>
  import("./tabs/notifications-tab").then((mod) => ({
    default: mod.NotificationsTab,
  }))
);

const PhoneVerificationTab = lazy(() =>
  import("./tabs/phone-verification-tab").then((mod) => ({
    default: mod.PhoneVerificationTab,
  }))
);

// Tab loading fallback
const TabLoadingFallback = () => (
  <div className="w-full h-[300px] flex items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
  </div>
);

export function ProfileContent() {
  const t = useTranslations("dashboard");
  const {
    isLoading,
    activeTab,
    showTwoFactorSetup,
    setActiveTab,
    setShowTwoFactorSetup,
  } = useUserStore();
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab") || "dashboard";
  const [pageTransition, setPageTransition] = useState(false);

  // Update URL when tab changes - with debounce
  useEffect(() => {
    if (activeTab !== tabParam) {
      setPageTransition(true);
      const timer = setTimeout(() => {
        router.push(`/user/profile?tab=${activeTab}`, { scroll: false });
        setPageTransition(false);
      }, 200); // Reduced timeout

      return () => clearTimeout(timer);
    }
  }, [activeTab, router, tabParam]);

  // Update active tab if URL parameter changes
  useEffect(() => {
    if (tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [tabParam, activeTab, setActiveTab]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-background to-muted/50">
        <div className="space-y-4 text-center">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
          </div>
          <p className="text-muted-foreground">
            {t("loading_your_profile_data")}.
          </p>
        </div>
      </div>
    );
  }

  const startTwoFactorSetup = () => {
    setShowTwoFactorSetup(true);
  };

  const handleTabChange = (tab: string) => {
    // Instead of setActiveTab(tab);
    router.push(`/user/profile?tab=${tab}`, { scroll: false });
  };

  return (
    <div className="min-h-full p-4 md:p-6 lg:p-8 bg-background/80 backdrop-blur-sm relative w-full">
      {/* Simplified background elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
        <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-gradient-to-bl from-primary/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-gradient-to-tr from-primary/5 to-transparent rounded-full blur-3xl" />
      </div>

      <AnimatePresence mode="wait">
        {showTwoFactorSetup ? (
          <motion.div
            key="2fa-setup"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="relative z-10 w-full"
          >
            <TwoFactorSetupFlow
              onCancel={() => setShowTwoFactorSetup(false)}
              onComplete={() => {
                setShowTwoFactorSetup(false);
              }}
            />
          </motion.div>
        ) : (
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full relative z-10"
          >
            <AnimatePresence mode="wait">
              {pageTransition ? (
                <motion.div
                  key="transition"
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.1 }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                </motion.div>
              ) : (
                <>
                  <TabsContent
                    value="dashboard"
                    className="mt-0 outline-none w-full min-h-fit"
                  >
                    <motion.div
                      key="dashboard-tab"
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 5 }}
                      transition={{ duration: 0.2 }}
                      className="w-full"
                    >
                      <Suspense fallback={<TabLoadingFallback />}>
                        <DashboardTab onTabChange={handleTabChange} />
                      </Suspense>
                    </motion.div>
                  </TabsContent>
                  <TabsContent
                    value="personal"
                    className="mt-0 outline-none w-full min-h-fit"
                  >
                    <motion.div
                      key="personal-tab"
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 5 }}
                      transition={{ duration: 0.2 }}
                      className="w-full"
                    >
                      <Suspense fallback={<TabLoadingFallback />}>
                        <PersonalInfoTab />
                      </Suspense>
                    </motion.div>
                  </TabsContent>
                  <TabsContent
                    value="security"
                    className="mt-0 outline-none w-full min-h-fit"
                  >
                    <motion.div
                      key="security-tab"
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 5 }}
                      transition={{ duration: 0.2 }}
                      className="w-full"
                    >
                      <Suspense fallback={<TabLoadingFallback />}>
                        <SecurityTab
                          startTwoFactorSetup={startTwoFactorSetup}
                        />
                      </Suspense>
                    </motion.div>
                  </TabsContent>
                  <TabsContent
                    value="wallet"
                    className="mt-0 outline-none w-full min-h-fit"
                  >
                    <motion.div
                      key="wallet-tab"
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 5 }}
                      transition={{ duration: 0.2 }}
                      className="w-full"
                    >
                      <Suspense fallback={<TabLoadingFallback />}>
                        <WalletTab />
                      </Suspense>
                    </motion.div>
                  </TabsContent>
                  <TabsContent
                    value="api"
                    className="mt-0 outline-none w-full min-h-fit"
                  >
                    <motion.div
                      key="api-tab"
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 5 }}
                      transition={{ duration: 0.2 }}
                      className="w-full"
                    >
                      <Suspense fallback={<TabLoadingFallback />}>
                        <ApiKeysTab />
                      </Suspense>
                    </motion.div>
                  </TabsContent>
                  <TabsContent
                    value="notifications"
                    className="mt-0 outline-none w-full min-h-fit"
                  >
                    <motion.div
                      key="notifications-tab"
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 5 }}
                      transition={{ duration: 0.2 }}
                      className="w-full"
                    >
                      <Suspense fallback={<TabLoadingFallback />}>
                        <NotificationsTab />
                      </Suspense>
                    </motion.div>
                  </TabsContent>
                  <TabsContent
                    value="phone-verification"
                    className="mt-0 outline-none w-full min-h-fit"
                  >
                    <motion.div
                      key="phone-verification-tab"
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 5 }}
                      transition={{ duration: 0.2 }}
                      className="w-full"
                    >
                      <Suspense fallback={<TabLoadingFallback />}>
                        <PhoneVerificationTab />
                      </Suspense>
                    </motion.div>
                  </TabsContent>
                </>
              )}
            </AnimatePresence>
          </Tabs>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ProfileContent;
