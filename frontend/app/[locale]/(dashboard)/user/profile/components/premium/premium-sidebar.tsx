"use client";

import { memo, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  User,
  Shield,
  Bell,
  Wallet,
  Key,
  LogOut,
  ChevronRight,
  Zap,
  ArrowLeft,
  Fingerprint,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserStore } from "@/store/user";
import { Link, useRouter } from "@/i18n/routing";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const PremiumSidebar = memo(function PremiumSidebar() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = searchParams.get("tab") || "dashboard";
  const { user, securityScore, profileCompletion, logout } = useUserStore();

  const handleTabClick = useCallback(
    (tabId: string) => {
      router.push(`/user/profile?tab=${tabId}`);
    },
    [router]
  );

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    }
    if (user?.firstName) return user.firstName.charAt(0).toUpperCase();
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return "U";
  };

  const navItems = useMemo(
    () => [
      {
        id: "dashboard",
        label: "Overview",
        icon: LayoutDashboard,
        description: "Account summary",
      },
      {
        id: "personal",
        label: "Profile",
        icon: User,
        description: "Personal information",
      },
      {
        id: "security",
        label: "Security",
        icon: Shield,
        description: "Protection settings",
        badge: !user?.twoFactor?.enabled ? 1 : undefined,
      },
      {
        id: "notifications",
        label: "Notifications",
        icon: Bell,
        description: "Alert preferences",
      },
      {
        id: "wallet",
        label: "Wallet",
        icon: Wallet,
        description: "Connected wallets",
      },
      {
        id: "api",
        label: "API Keys",
        icon: Key,
        description: "Developer access",
      },
    ],
    [user?.twoFactor?.enabled]
  );

  const getSecurityColor = () => {
    if (securityScore >= 80) return "text-emerald-400";
    if (securityScore >= 50) return "text-amber-400";
    return "text-red-400";
  };

  return (
    <div className="w-72 bg-zinc-950 border-r border-zinc-800/50 flex flex-col h-screen sticky top-0">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-amber-500/[0.02] to-transparent pointer-events-none" />

      {/* Back Link */}
      <div className="relative px-4 pt-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      {/* User Mini Profile */}
      <div className="relative px-4 py-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-12 w-12 ring-2 ring-zinc-800">
              <AvatarImage
                src={user?.avatar || "/img/avatars/placeholder.webp"}
                alt={`${user?.firstName} ${user?.lastName}`}
              />
              <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-600 text-white font-semibold">
                {getUserInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-zinc-950" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-zinc-500 truncate">
              @{user?.email?.split("@")[0]}
            </p>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn("text-sm font-bold", getSecurityColor())}>
                  {securityScore}%
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">Security Score</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Mini Progress Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-zinc-600">Profile</span>
            <span className="text-zinc-400">{profileCompletion}%</span>
          </div>
          <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${profileCompletion}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500"
            />
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent mx-4" />

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
        <ul className="space-y-1">
          {navItems.map((item, index) => {
            const isActive = activeTab === item.id;

            return (
              <motion.li
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <button
                  type="button"
                  onClick={() => handleTabClick(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative",
                    isActive
                      ? "bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-white"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                  )}
                >
                  {/* Active indicator */}
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-amber-400 to-orange-500 rounded-r-full"
                    />
                  )}

                  {/* Icon container */}
                  <div
                    className={cn(
                      "flex items-center justify-center h-9 w-9 rounded-lg transition-colors",
                      isActive
                        ? "bg-gradient-to-br from-amber-500/20 to-orange-500/20"
                        : "bg-zinc-800/50 group-hover:bg-zinc-800"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "h-4.5 w-4.5",
                        isActive ? "text-amber-400" : "text-zinc-500 group-hover:text-zinc-300"
                      )}
                    />
                  </div>

                  {/* Label and description */}
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span>{item.label}</span>
                      {item.badge && (
                        <span className="flex items-center justify-center h-4 w-4 rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-xs",
                        isActive ? "text-zinc-400" : "text-zinc-600"
                      )}
                    >
                      {item.description}
                    </span>
                  </div>

                  {/* Arrow */}
                  <ChevronRight
                    className={cn(
                      "h-4 w-4 transition-transform",
                      isActive
                        ? "text-amber-400 translate-x-0"
                        : "text-zinc-700 -translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-100"
                    )}
                  />
                </button>
              </motion.li>
            );
          })}
        </ul>
      </nav>

      {/* Security Tip Card */}
      <div className="px-3 pb-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="relative overflow-hidden rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-900/50 border border-zinc-800/50 p-4"
        >
          {/* Glow effect */}
          <div className="absolute -top-12 -right-12 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl" />

          <div className="relative flex items-start gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-amber-500/10 flex-shrink-0">
              <Fingerprint className="h-5 w-5 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-white mb-1">
                Security Tip
              </h4>
              <p className="text-xs text-zinc-500 leading-relaxed">
                {!user?.twoFactor?.enabled
                  ? "Enable 2FA to protect your account from unauthorized access."
                  : "Your account is protected with two-factor authentication."}
              </p>
              {!user?.twoFactor?.enabled && (
                <button
                  onClick={() => handleTabClick("security")}
                  className="inline-flex items-center gap-1 text-xs font-medium text-amber-400 hover:text-amber-300 mt-2 transition-colors"
                >
                  <Zap className="h-3 w-3" />
                  Enable Now
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Logout Button */}
      <div className="relative px-3 pb-4">
        <div className="h-px bg-gradient-to-r from-transparent via-zinc-800 to-transparent mb-3" />
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full justify-start gap-3 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl h-11"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </Button>
      </div>
    </div>
  );
});

export default PremiumSidebar;
