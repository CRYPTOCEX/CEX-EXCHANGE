"use client";

import { memo, useState } from "react";
import { m, AnimatePresence } from "framer-motion";
import {
  Camera,
  Shield,
  Settings,
  Edit3,
  CheckCircle2,
  Clock,
  Sparkles,
  Crown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { statusTone } from "@/lib/status-tone";
import type { BadgeTone } from "@/components/ui/badge";
import { useUserStore } from "@/store/user";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSettings } from "@/hooks/use-settings";
import { useTranslations } from "next-intl";
import { AvatarPickerDialog } from "@/components/user/avatar-picker-dialog";

interface ProfileHeroProps {
  onEditProfile?: () => void;
  onSettings?: () => void;
  currentTab?: string;
}

/**
 * Solid fill for the account-status dot. Not a status decision — `statusTone()`
 * owns that; this only says how a 20px dot paints a given tone.
 */
const TONE_DOT: Record<BadgeTone, string> = {
  primary: "bg-primary",
  secondary: "bg-secondary",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  info: "bg-info",
  neutral: "bg-muted",
};

export const ProfileHero = memo(function ProfileHero({
  onEditProfile,
  onSettings,
  currentTab = "dashboard",
}: ProfileHeroProps) {
  const t = useTranslations("dashboard_user");
  const tCommon = useTranslations("common");
  const { user, securityScore, profileCompletion } = useUserStore();
  const { settings } = useSettings();
  /* The avatar flow lives in `AvatarPickerDialog` now — the file input, the
     `imageUploader` call and the toast were written here AND in the Personal
     Information tab, identically, which is two places for a size limit or an
     upload directory to drift apart unnoticed. */
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);

  // Check if KYC is enabled
  const kycEnabled = settings?.kycStatus === true || settings?.kycStatus === "true";

  if (!user) return null;

  const getUserInitials = () => {
    if (user.firstName && user.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    }
    if (user.firstName) return user.firstName.charAt(0).toUpperCase();
    if (user.email) return user.email.charAt(0).toUpperCase();
    return "U";
  };

  const handleAvatarClick = () => {
    setAvatarPickerOpen(true);
  };

  /**
   * The KYC tier pill: fill + its own ink, no gradient.
   *
   * Every branch used to be `from-<tone> to-<tone>` — two identical stops, so the
   * `` at the call site only ever produced a flat fill anyway.
   * Gold was the worst of them: a saturated `warning` pill inked `text-warning`,
   * i.e. the word "Gold" painted in its own background colour. Gold and Bronze
   * were also the SAME fill and differed only by that (broken) ink, so the two
   * tiers were indistinguishable; Bronze is the tint of the same tone now, which
   * separates them without introducing a fourth hue.
   */
  const getKycBadgeStyle = () => {
    const level = user.kycLevel || 0;
    if (level >= 3) return "bg-warning text-warning-foreground";
    if (level >= 2) return "bg-muted text-foreground";
    if (level >= 1) return "bg-warning/15 text-warning-ink";
    return "bg-muted text-muted-foreground";
  };

  const getKycLabel = () => {
    const level = user.kycLevel || 0;
    if (level >= 3) return "Gold";
    if (level >= 2) return "Silver";
    if (level >= 1) return "Bronze";
    return "Unverified";
  };

  const memberSince = new Date(user.createdAt || Date.now());
  const accountAge = Math.floor(
    (Date.now() - memberSince.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Calculate security ring
  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference - (securityScore / 100) * circumference;

  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-2xl"
    >
      {/* Background with mesh gradient */}
      <div className="absolute inset-0 bg-linear-to-br from-surface-2 via-surface-2 to-muted" />

      {/* Animated gradient orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <m.div
          animate={{
            x: [0, 30, 0],
            y: [0, -20, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 rounded-full bg-linear-to-br from-warning/20 to-warning/10 blur-3xl"
        />
        <m.div
          animate={{
            x: [0, -20, 0],
            y: [0, 30, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 rounded-full bg-linear-to-tr from-primary/15 to-primary/10 blur-3xl"
        />
      </div>

      {/* Noise texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Content */}
      <div className="relative z-10 px-6 py-8 md:px-10 md:py-12">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
          {/* Left: Avatar and Info */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar with Security Ring */}
            <div className="relative group">
              {/* Security score ring */}
              <svg
                className="absolute -inset-3 w-[calc(100%+24px)] h-[calc(100%+24px)] -rotate-90"
                viewBox="0 0 120 120"
              >
                {/* Background ring */}
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  className="text-muted-foreground/50"
                />
                {/* Progress ring */}
                <m.circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke="url(#securityGradient)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset }}
                  transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
                />
                <defs>
                  <linearGradient id="securityGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="hsl(var(--warning))" />
                    <stop offset="50%" stopColor="hsl(var(--warning) / 0.85)" />
                    <stop offset="100%" stopColor="hsl(var(--warning) / 0.7)" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Avatar */}
              <m.div
                whileHover={{ scale: 1.02 }}
                className="relative cursor-pointer"
                onClick={handleAvatarClick}
              >
                {/* No `shadow-2xl`. R3 puts depth in the surface ramp, and the ring
                    plus the security arc around it already separate this from the
                    hero ground — the shadow was doing nothing the ring was not.
                    It went unseen by the ratchet until the code above it moved. */}
                <Avatar className="h-28 w-28 md:h-32 md:w-32 ring-4 ring-border">
                  <AvatarImage
                    src={user.avatar || "/img/avatars/placeholder.webp"}
                    alt={`${user.firstName} ${user.lastName}`}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-warning text-warning-foreground text-3xl font-semibold">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>

                {/* Upload overlay */}
                <AnimatePresence>
                  <m.div
                    initial={{ opacity: 0 }}
                    whileHover={{ opacity: 1 }}
                    className="absolute inset-0 rounded-full bg-overlay/60 flex items-center justify-center backdrop-blur-sm"
                  >
                    {/* On the `bg-overlay/60` scrim, so the glyph wears the
                        scrim's ink token. No spinner branch any more: the work
                        happens inside the picker, where its own progress is
                        visible on the tile that was clicked. */}
                    <Camera className="h-7 w-7 text-overlay-foreground" />
                  </m.div>
                </AnimatePresence>

                {/* Online status indicator */}
                <div className={cn(
                  "absolute bottom-1 right-1 h-5 w-5 rounded-full ring-4 ring-border",
                  TONE_DOT[statusTone(user.status)]
                )} />
              </m.div>

              {/* KYC Badge - only show if KYC is enabled */}
              {kycEnabled && (user.kycLevel || 0) > 0 && (
                <m.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.5, type: "spring" }}
                  className="absolute -bottom-2 left-1/2 -translate-x-1/2"
                >
                  <div className={cn(
                    "flex items-center gap-1 px-3 py-1 rounded-full shadow-lg",
                    getKycBadgeStyle()
                  )}>
                    <Crown className="h-3.5 w-3.5" />
                    <span className="text-xs font-bold tracking-wide">{getKycLabel()}</span>
                  </div>
                </m.div>
              )}
            </div>

            {/* User Info */}
            <div className="text-center sm:text-left space-y-3">
              <div>
                {/* THE PAGE'S ONE `<h1>`, and the account's own name is the
                    right thing for it to be: this hero is the profile screen's
                    header, and the name is what the screen is about.
                    /en/user/profile used to render THREE — this, the
                    `lg:hidden` "Profile" bar, and the open tab's own heading —
                    so a screen reader announced three page titles and the
                    document outline had three roots. The other two are `<h2>`
                    now. Anything added here that reads as a page title belongs
                    at h2 or below. */}
                <m.h1
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-2xl md:text-3xl font-bold text-foreground tracking-tight flex items-center justify-center sm:justify-start gap-3"
                >
                  {user.firstName} {user.lastName}
                  {user.emailVerified && (
                      <Tooltip>
                        <TooltipTrigger>
                          <CheckCircle2 className="h-5 w-5 text-warning" />
                        </TooltipTrigger>
                        <TooltipContent>{tCommon("email_verified")}</TooltipContent>
                      </Tooltip>
                  )}
                </m.h1>
                <m.p
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-muted-foreground font-medium"
                >
                  @{user.email?.split("@")[0] || "user"}
                </m.p>
              </div>

              {/* Stats Pills */}
              <m.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex flex-wrap items-center justify-center sm:justify-start gap-2"
              >
                <Badge
                  variant="outline"
                  className="bg-muted/80 border-border-strong text-muted-foreground px-3 py-1"
                >
                  <Clock className="h-3 w-3 mr-1.5" />
                  {accountAge} days
                </Badge>
                <Badge
                  variant="outline"
                  className="bg-muted/80 border-border-strong text-muted-foreground px-3 py-1"
                >
                  <Shield className="h-3 w-3 mr-1.5" />
                  {securityScore}% Secure
                </Badge>
                {user.twoFactor?.enabled && (
                  <Badge
                    variant="outline"
                    className="bg-success/10 border-success/30 text-success-ink px-3 py-1"
                  >
                    <Sparkles className="h-3 w-3 mr-1.5" />
                    {`2FA ${tCommon('active')}`}
                  </Badge>
                )}
              </m.div>

              {/* Profile Completion */}
              <m.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="max-w-xs mx-auto sm:mx-0"
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-subtle-foreground">{t("profile_completion")}</span>
                  <span className="text-warning font-semibold">{profileCompletion}%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <m.div
                    initial={{ width: 0 }}
                    animate={{ width: `${profileCompletion}%` }}
                    transition={{ duration: 1, delay: 0.6, ease: "easeOut" }}
                    className="h-full bg-warning rounded-full"
                  />
                </div>
              </m.div>
            </div>
          </div>

          {/* Right: Actions - Conditional based on current tab */}
          <m.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="flex items-center justify-center gap-3"
          >
            {/* Settings button - show on Overview and Profile tabs */}
            {(currentTab === "dashboard" || currentTab === "personal") && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={onSettings}
                      className="h-11 w-11 rounded-xl bg-muted/80 border-border-strong hover:bg-muted hover:border-border-strong text-muted-foreground"
                    >
                      <Settings className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Settings</TooltipContent>
                </Tooltip>
            )}

            {/* Edit Profile button - show on Overview and Security tabs */}
            {(currentTab === "dashboard" || currentTab === "security") && (
              <Button
                onClick={onEditProfile}
                className="h-11 px-5 rounded-xl bg-warning hover:bg-warning/90 text-warning-foreground font-semibold shadow-lg shadow-warning/25 transition-all hover:shadow-warning/40"
              >
                <Edit3 className="h-4 w-4 mr-2" />
                {tCommon("edit_profile")}
              </Button>
            )}
          </m.div>
        </div>
      </div>

      {/* Bottom border glow */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-warning/50 to-transparent" />

      <AvatarPickerDialog open={avatarPickerOpen} onOpenChange={setAvatarPickerOpen} />
    </m.div>
  );
});

export default ProfileHero;
