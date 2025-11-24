"use client";

import { useSearchParams } from "next/navigation";
import { memo, useMemo } from "react";
import {
  BarChart2,
  User,
  Shield,
  Bell,
  Wallet,
  Key,
  ChevronRight,
  ArrowLeft,
  Home,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useUserStore } from "@/store/user";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Memoize the sidebar component to prevent unnecessary re-renders
export const ProfileSidebar = memo(function ProfileSidebar() {
  const t = useTranslations("dashboard");
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "dashboard";
  const { user, profileCompletion } = useUserStore();

  // Helper function to get user initials
  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    }
    if (user?.firstName) {
      return user.firstName.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return "U";
  };

  const navItems = useMemo(
    () => [
      {
        id: "dashboard",
        label: "Dashboard",
        icon: BarChart2,
        href: "/user/profile?tab=dashboard",
      },
      {
        id: "personal",
        label: "Personal Info",
        icon: User,
        href: "/user/profile?tab=personal",
      },
      {
        id: "security",
        label: "Security",
        icon: Shield,
        href: "/user/profile?tab=security",
      },
      {
        id: "notifications",
        label: "Notifications",
        icon: Bell,
        href: "/user/profile?tab=notifications",
      },
      {
        id: "wallet",
        label: "Wallet",
        icon: Wallet,
        href: "/user/profile?tab=wallet",
      },
      {
        id: "api",
        label: "API Keys",
        icon: Key,
        href: "/user/profile?tab=api",
      },
    ],
    []
  );

  // Reduce animation complexity
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.03, // Reduced stagger time
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -5 }, // Reduced movement
    show: { opacity: 1, x: 0 },
  };

  return (
    <div className="w-full max-w-[280px] bg-background/80 backdrop-blur-xl border-r border-border/50 relative min-h-screen lg:h-screen flex flex-col">
      {/* Simplified background elements - reduced complexity */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className="absolute -top-[30%] -right-[20%] w-[80%] h-[80%] rounded-full bg-gradient-to-br from-primary/20 to-blue-500/20 blur-3xl" />
        <div className="absolute -bottom-[30%] -left-[20%] w-[80%] h-[80%] rounded-full bg-gradient-to-tr from-blue-500/20 to-purple-500/20 blur-3xl" />
      </div>

      {/* Back Button - Compact */}
      <div className="p-3 relative flex-shrink-0">
        <Link
          href="/"
          className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-muted/50 group w-fit"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>{t("Home")}</span>
        </Link>
      </div>

      <div className="p-4 lg:p-6 flex flex-col items-center border-b border-border/50 relative flex-shrink-0">
        <div className="relative w-20 lg:w-24 h-20 lg:h-24 mb-4">
          <Avatar className="w-full h-full border-2 border-primary/20 shadow-lg">
            <AvatarImage
              src={user?.avatar || "/img/avatars/placeholder.webp"}
              alt={`${user?.firstName} ${user?.lastName}`}
              className="object-cover"
            />
            <AvatarFallback className="bg-primary text-primary-foreground font-bold text-lg lg:text-xl">
              {getUserInitials()}
            </AvatarFallback>
          </Avatar>

          {/* Verification badge */}
          {user?.kycLevel && user.kycLevel > 0 && (
            <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-1.5 shadow-md border-2 border-background">
              <Shield className="h-3.5 w-3.5" />
            </div>
          )}
        </div>

        <div className="text-center">
          <h2 className="text-xl lg:text-2xl font-bold text-foreground">
            {user?.firstName} {user?.lastName}
          </h2>
          <p className="text-muted-foreground text-sm">
            @
            {user?.email?.split("@")[0] || "user"}
          </p>
        </div>

        <div className="mt-4 flex items-center">
          <span className="bg-primary/15 text-primary text-xs font-medium px-3 py-1.5 rounded-full flex items-center shadow-sm">
            <span className="w-2 h-2 bg-primary rounded-full mr-1.5"></span>
            {t("Level")}{" "}
            {user?.kycLevel}{" "}
            {t("Verified")}
          </span>
        </div>

        <div className="w-full mt-4 lg:mt-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">
              {t("profile_completion")}
            </span>
            <span className="font-medium text-foreground">
              {profileCompletion}%
            </span>
          </div>
          <div className="w-full bg-muted/20 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary/80 via-purple-500/80 to-blue-500/80 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${profileCompletion}%` }}
            />
          </div>

          <div className="mt-4 flex flex-col lg:flex-row lg:justify-between lg:items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {t("member_since")}{" "}
              {new Date(user?.createdAt || "").toLocaleDateString()}
            </span>
            <Link
              href="/user/profile?tab=personal"
              className="text-xs text-primary hover:text-primary/80 flex items-center justify-center lg:justify-start"
            >
              {t("complete_profile")}
              <ChevronRight className="h-3 w-3 ml-0.5" />
            </Link>
          </div>
        </div>
      </div>

      <nav className="p-4 flex-1 overflow-y-auto">
        <motion.ul
          className="space-y-1.5"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {navItems.map((item) => (
            <motion.li
              key={item.id}
              variants={itemVariants}
              transition={{ duration: 0.2 }}
            >
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 overflow-hidden relative group",
                  activeTab === item.id
                    ? "bg-primary/10 text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <div
                  className={cn(
                    "p-1.5 rounded-md transition-all duration-200 z-10",
                    activeTab === item.id
                      ? "bg-primary/20"
                      : "bg-muted group-hover:bg-primary/10"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                </div>
                <span className="z-10">{item.label}</span>
                {activeTab === item.id && (
                  <div className="ml-auto w-1.5 h-5 bg-gradient-to-b from-primary to-primary/70 rounded-full" />
                )}
              </Link>
            </motion.li>
          ))}
        </motion.ul>

        <div className="mt-8 p-4 rounded-lg border border-border/50 bg-muted/30 relative overflow-hidden">
          <div className="flex items-start space-x-3 relative">
            <div className="p-2 rounded-full bg-primary/10 flex-shrink-0">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-medium text-foreground">
                {t("security_tips")}
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                {t("enable_2fa_for_enhanced_account_protection")}.
              </p>
              <Link
                href="/user/profile?tab=security"
                className="text-xs text-primary hover:underline mt-2 inline-block"
              >
                {t("security_settings")}
              </Link>
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
});

export default ProfileSidebar;
