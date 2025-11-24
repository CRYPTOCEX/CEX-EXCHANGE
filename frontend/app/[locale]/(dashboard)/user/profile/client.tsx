"use client";

import { useEffect, Suspense, lazy, useState } from "react";
import { motion } from "framer-motion";
import { useUserStore } from "@/store/user";
import { useRouter } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { Loader2, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

// Lazy load components
const ProfileSidebar = lazy(() =>
  import("./components/profile-sidebar").then((mod) => ({
    default: mod.ProfileSidebar,
  }))
);
const ProfileContent = lazy(() =>
  import("./components/profile-content").then((mod) => ({
    default: mod.ProfileContent,
  }))
);

// Loading fallbacks
const SidebarFallback = () => (
  <div className="w-full max-w-[280px] bg-background/80 backdrop-blur-xl border-r border-border/50 flex items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
  </div>
);

const ContentFallback = () => (
  <div className="flex-1 p-6 md:p-8 bg-background/80 backdrop-blur-sm flex items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
  </div>
);

export function UserProfileClient() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
      ].includes(tabParam)
    ) {
      setActiveTab(tabParam);
    }
  }, [tabParam, setActiveTab]);

  // Fetch security data when component mounts - with debounce
  useEffect(() => {
    if (user) {
      // Delay calculations to prioritize UI rendering
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

  return (
    <motion.div
      className="flex h-screen bg-background backdrop-blur-sm w-full overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }} // Reduced animation duration
    >
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Suspense fallback={<SidebarFallback />}>
          <ProfileSidebar />
        </Suspense>
      </div>

      {/* Mobile Header with Menu Button */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/50 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Profile</h1>
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[280px]">
              <Suspense fallback={<SidebarFallback />}>
                <ProfileSidebar />
              </Suspense>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative overflow-auto pt-16 lg:pt-0">
        <Suspense fallback={<ContentFallback />}>
          <ProfileContent />
        </Suspense>
      </div>
    </motion.div>
  );
}
