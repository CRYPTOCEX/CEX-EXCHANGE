"use client";

import { memo, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import { useUserStore } from "@/store/user";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { imageUploader } from "@/utils/upload";
import { useSettings } from "@/hooks/use-settings";

interface ProfileHeroProps {
  onEditProfile?: () => void;
  onSettings?: () => void;
  currentTab?: string;
}

export const ProfileHero = memo(function ProfileHero({
  onEditProfile,
  onSettings,
  currentTab = "dashboard",
}: ProfileHeroProps) {
  const { user, securityScore, profileCompletion, updateAvatar } = useUserStore();
  const { settings } = useSettings();
  const { toast } = useToast();
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    fileInputRef.current?.click();
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    const result = await imageUploader({
      file,
      dir: "avatars",
      size: { maxWidth: 400, maxHeight: 400 },
      oldPath: user.avatar || "",
    });

    if (result.success && result.url) {
      await updateAvatar(result.url);
      toast({
        title: "Avatar Updated",
        description: "Your profile picture has been updated successfully.",
      });
    }
    setIsUploadingAvatar(false);
  };

  const getStatusColor = () => {
    switch (user.status) {
      case "ACTIVE":
        return "bg-emerald-500";
      case "INACTIVE":
        return "bg-zinc-500";
      case "SUSPENDED":
        return "bg-amber-500";
      case "BANNED":
        return "bg-red-500";
      default:
        return "bg-emerald-500";
    }
  };

  const getKycBadgeStyle = () => {
    const level = user.kycLevel || 0;
    if (level >= 3) return "from-amber-400 to-amber-600 text-amber-950";
    if (level >= 2) return "from-slate-300 to-slate-400 text-slate-900";
    if (level >= 1) return "from-amber-600 to-amber-800 text-amber-100";
    return "from-zinc-600 to-zinc-700 text-zinc-200";
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-2xl"
    >
      {/* Background with mesh gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950" />

      {/* Animated gradient orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{
            x: [0, 30, 0],
            y: [0, -20, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-600/10 blur-3xl"
        />
        <motion.div
          animate={{
            x: [0, -20, 0],
            y: [0, 30, 0],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 rounded-full bg-gradient-to-tr from-violet-600/15 to-indigo-500/10 blur-3xl"
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
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleAvatarUpload}
              />

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
                  className="text-zinc-700/50"
                />
                {/* Progress ring */}
                <motion.circle
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
                    <stop offset="0%" stopColor="#fbbf24" />
                    <stop offset="50%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#d97706" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Avatar */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="relative cursor-pointer"
                onClick={handleAvatarClick}
              >
                <Avatar className="h-28 w-28 md:h-32 md:w-32 ring-4 ring-zinc-800 shadow-2xl">
                  <AvatarImage
                    src={user.avatar || "/img/avatars/placeholder.webp"}
                    alt={`${user.firstName} ${user.lastName}`}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-600 text-white text-3xl font-semibold">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>

                {/* Upload overlay */}
                <AnimatePresence>
                  <motion.div
                    initial={{ opacity: 0 }}
                    whileHover={{ opacity: 1 }}
                    className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center backdrop-blur-sm"
                  >
                    {isUploadingAvatar ? (
                      <div className="h-6 w-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Camera className="h-7 w-7 text-white" />
                    )}
                  </motion.div>
                </AnimatePresence>

                {/* Online status indicator */}
                <div className={cn(
                  "absolute bottom-1 right-1 h-5 w-5 rounded-full ring-4 ring-zinc-900",
                  getStatusColor()
                )} />
              </motion.div>

              {/* KYC Badge - only show if KYC is enabled */}
              {kycEnabled && (user.kycLevel || 0) > 0 && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.5, type: "spring" }}
                  className="absolute -bottom-2 left-1/2 -translate-x-1/2"
                >
                  <div className={cn(
                    "flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r shadow-lg",
                    getKycBadgeStyle()
                  )}>
                    <Crown className="h-3.5 w-3.5" />
                    <span className="text-xs font-bold tracking-wide">{getKycLabel()}</span>
                  </div>
                </motion.div>
              )}
            </div>

            {/* User Info */}
            <div className="text-center sm:text-left space-y-3">
              <div>
                <motion.h1
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center justify-center sm:justify-start gap-3"
                >
                  {user.firstName} {user.lastName}
                  {user.emailVerified && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <CheckCircle2 className="h-5 w-5 text-amber-400" />
                        </TooltipTrigger>
                        <TooltipContent>Email Verified</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-zinc-400 font-medium"
                >
                  @{user.email?.split("@")[0] || "user"}
                </motion.p>
              </div>

              {/* Stats Pills */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex flex-wrap items-center justify-center sm:justify-start gap-2"
              >
                <Badge
                  variant="outline"
                  className="bg-zinc-800/80 border-zinc-700 text-zinc-300 px-3 py-1"
                >
                  <Clock className="h-3 w-3 mr-1.5" />
                  {accountAge} days
                </Badge>
                <Badge
                  variant="outline"
                  className="bg-zinc-800/80 border-zinc-700 text-zinc-300 px-3 py-1"
                >
                  <Shield className="h-3 w-3 mr-1.5" />
                  {securityScore}% Secure
                </Badge>
                {user.twoFactor?.enabled && (
                  <Badge
                    variant="outline"
                    className="bg-emerald-500/10 border-emerald-500/30 text-emerald-400 px-3 py-1"
                  >
                    <Sparkles className="h-3 w-3 mr-1.5" />
                    2FA Active
                  </Badge>
                )}
              </motion.div>

              {/* Profile Completion */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="max-w-xs mx-auto sm:mx-0"
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-zinc-500">Profile Completion</span>
                  <span className="text-amber-400 font-semibold">{profileCompletion}%</span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${profileCompletion}%` }}
                    transition={{ duration: 1, delay: 0.6, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                  />
                </div>
              </motion.div>
            </div>
          </div>

          {/* Right: Actions - Conditional based on current tab */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="flex items-center justify-center gap-3"
          >
            {/* Settings button - show on Overview and Profile tabs */}
            {(currentTab === "dashboard" || currentTab === "personal") && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={onSettings}
                      className="h-11 w-11 rounded-xl bg-zinc-800/80 border-zinc-700 hover:bg-zinc-700 hover:border-zinc-600 text-zinc-300"
                    >
                      <Settings className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Settings</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Edit Profile button - show on Overview and Security tabs */}
            {(currentTab === "dashboard" || currentTab === "security") && (
              <Button
                onClick={onEditProfile}
                className="h-11 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-semibold shadow-lg shadow-amber-500/25 transition-all hover:shadow-amber-500/40"
              >
                <Edit3 className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            )}
          </motion.div>
        </div>
      </div>

      {/* Bottom border glow */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
    </motion.div>
  );
});

export default ProfileHero;
