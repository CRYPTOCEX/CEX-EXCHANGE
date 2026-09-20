"use client";

import { memo, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { m } from "framer-motion";
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
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslations } from "next-intl";

export const PremiumSidebar = memo(function PremiumSidebar() {
  const t = useTranslations("dashboard_user");
  const tCommon = useTranslations("common");
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
        label: tCommon("overview"),
        icon: LayoutDashboard,
        description: tCommon("account_summary"),
      },
      {
        id: "personal",
        label: tCommon("profile"),
        icon: User,
        description: tCommon("personal_info"),
      },
      {
        id: "security",
        label: tCommon("security"),
        icon: Shield,
        description: t("protection_settings"),
        badge: !user?.twoFactor?.enabled ? 1 : undefined,
      },
      {
        id: "notifications",
        label: tCommon("notifications"),
        icon: Bell,
        description: t("alert_preferences"),
      },
      {
        id: "wallet",
        label: tCommon("wallet"),
        icon: Wallet,
        description: t("connected_wallets"),
      },
      {
        id: "api",
        label: tCommon("api_keys"),
        icon: Key,
        description: t("developer_access"),
      },
    ],
    [user?.twoFactor?.enabled]
  );

  const getSecurityColor = () => {
    if (securityScore >= 80) return "text-success";
    if (securityScore >= 50) return "text-warning";
    return "text-destructive";
  };

  return (
    <div className="w-72 bg-background border-r border-border/50 flex flex-col h-screen sticky top-0">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-linear-to-b from-warning/[0.02] to-transparent pointer-events-none" />

      {/* Back Link */}
      <div className="relative px-4 pt-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-subtle-foreground hover:text-muted-foreground transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          <span>{tCommon("back_to_dashboard")}</span>
        </Link>
      </div>

      {/* User Mini Profile */}
      <div className="relative px-4 py-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-12 w-12 ring-2 ring-border">
              <AvatarImage
                src={user?.avatar || "/img/avatars/placeholder.webp"}
                alt={`${user?.firstName} ${user?.lastName}`}
              />
              {/* `` with no stops is a dead class. */}
              <AvatarFallback className="bg-warning text-warning-foreground font-semibold">
                {getUserInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-success ring-2 ring-border" />
          </div>
          <div className="flex-1 min-w-0">
            {/* The sidebar surface is not a `bg-success` fill, so the user's name
                is --foreground. As --success-foreground (white in light mode) it
                was invisible on every light theme. */}
            <p className="text-sm font-semibold text-foreground truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-subtle-foreground truncate">
              @{user?.email?.split("@")[0]}
            </p>
          </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn("text-sm font-bold", getSecurityColor())}>
                  {securityScore}%
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">{tCommon("security_score")}</TooltipContent>
            </Tooltip>
        </div>

        {/* Mini Progress Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-muted-foreground">Profile</span>
            <span className="text-muted-foreground">{profileCompletion}%</span>
          </div>
          <div className="h-1 bg-muted rounded-full overflow-hidden">
            <m.div
              initial={{ width: 0 }}
              animate={{ width: `${profileCompletion}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full bg-warning"
            />
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-linear-to-r from-transparent via-muted to-transparent mx-4" />

      {/* Navigation */}
      {/* `scrollbar-thumb-zinc-800` was the only hardcoded PALETTE colour left in
          this tree, and it hid from the ratchet inside a plugin namespace:
          `tailwind-scrollbar` is in package.json but is NOT registered as a v4
          plugin, so the class compiled to nothing and reviewers read it as
          styling. `.scrollbar-thin` in globals.css already paints the thumb with
          `--border-strong`, which is what the panel can reach. */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto scrollbar-thin scrollbar-track-transparent">
        <ul className="space-y-1">
          {navItems.map((item, index) => {
            const isActive = activeTab === item.id;

            return (
              <m.li
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <button
                  type="button"
                  onClick={() => handleTabClick(item.id)}
                  data-tour={
                    item.id === "security" ? "profile-security" : undefined
                  }
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative",
                    isActive
                      /* Was `bg-gradient-to-r from-warning/10 to-warning/10` — two
                         identical stops, i.e. a flat tint — inked
                         `--warning-foreground`, which is WHITE in light mode, so
                         the selected nav item's own label disappeared. */
                      ? "bg-warning/10 text-warning-ink"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  {/* Active indicator */}
                  {isActive && (
                    <m.div
                      layoutId="activeTab"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-warning rounded-r-full"
                    />
                  )}

                  {/* Icon container */}
                  <div
                    className={cn(
                      "flex items-center justify-center h-9 w-9 rounded-lg transition-colors",
                      isActive
                        ? "bg-warning/20"
                        : "bg-muted/50 group-hover:bg-muted"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "h-4.5 w-4.5",
                        isActive ? "text-warning" : "text-subtle-foreground group-hover:text-muted-foreground"
                      )}
                    />
                  </div>

                  {/* Label and description */}
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span>{item.label}</span>
                      {item.badge && (
                        <span className="flex items-center justify-center h-4 w-4 rounded-full bg-destructive/10 text-destructive-ink text-[10px] font-bold">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-xs",
                        isActive ? "text-muted-foreground" : "text-muted-foreground"
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
                        ? "text-warning translate-x-0"
                        : "text-foreground -translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-100"
                    )}
                  />
                </button>
              </m.li>
            );
          })}
        </ul>
      </nav>

      {/* Security Tip Card */}
      <div className="px-3 pb-3">
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="relative overflow-hidden rounded-xl bg-linear-to-br from-surface-2 to-surface-2/50 border border-border/50 p-4"
        >
          {/* Glow effect */}
          <div className="absolute -top-12 -right-12 w-24 h-24 bg-warning/10 rounded-full blur-2xl" />

          <div className="relative flex items-start gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-warning/10 flex-shrink-0">
              <Fingerprint className="h-5 w-5 text-warning" />
            </div>
            <div className="flex-1 min-w-0">
              {/* On the neutral `surface-2` tip card with only a warning bloom behind it —
                  --warning-foreground is WHITE in light mode, so this heading
                  vanished on every light theme. */}
              <h4 className="text-sm font-semibold text-foreground mb-1">
                {t("security_tip")}
              </h4>
              <p className="text-xs text-subtle-foreground leading-relaxed">
                {!user?.twoFactor?.enabled
                  ? t("enable_2fa_to_protect_your_account")
                  : t("your_account_is_protected_with_two")}
              </p>
              {!user?.twoFactor?.enabled && (
                <button
                  onClick={() => handleTabClick("security")}
                  className="inline-flex items-center gap-1 text-xs font-medium text-warning hover:text-warning mt-2 transition-colors"
                >
                  <Zap className="h-3 w-3" />
                  {t("enable_now")}
                </button>
              )}
            </div>
          </div>
        </m.div>
      </div>

      {/* Logout Button */}
      <div className="relative px-3 pb-4">
        <div className="h-px bg-linear-to-r from-transparent via-muted to-transparent mb-3" />
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full justify-start gap-3 text-subtle-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl h-11"
        >
          <LogOut className="h-4 w-4" />
          <span>{tCommon("sign_out")}</span>
        </Button>
      </div>
    </div>
  );
});

export default PremiumSidebar;
