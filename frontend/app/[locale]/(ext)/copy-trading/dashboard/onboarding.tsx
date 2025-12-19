"use client";

import { useState } from "react";
import { Link } from "@/i18n/routing";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import {
  Crown,
  Rocket,
  Target,
  Users,
  TrendingUp,
  Settings,
  Coins,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  BarChart3,
  Shield,
  Gift,
  Zap,
  ChevronRight,
  PlayCircle,
  BookOpen,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: any;
  completed: boolean;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

interface LeaderOnboardingProps {
  leaderProfile: {
    displayName: string;
    totalTrades: number;
    totalFollowers: number;
    markets?: any[];
    bio?: string;
    isPublic: boolean;
  };
  onDismiss: () => void;
  onNavigateToTab: (tab: string) => void;
}

export default function LeaderOnboarding({
  leaderProfile,
  onDismiss,
  onNavigateToTab,
}: LeaderOnboardingProps) {
  const t = useTranslations("ext_copy-trading");
  const tExt = useTranslations("ext");
  const [currentStep, setCurrentStep] = useState(0);

  // Calculate completed steps
  const hasMarkets = (leaderProfile.markets?.length || 0) > 0;
  const hasBio = !!leaderProfile.bio && leaderProfile.bio.length > 10;
  const isPublic = leaderProfile.isPublic;
  const hasFirstTrade = leaderProfile.totalTrades > 0;
  const hasFirstFollower = leaderProfile.totalFollowers > 0;

  const steps: OnboardingStep[] = [
    {
      id: "welcome",
      title: "Welcome to Copy Trading!",
      description: "You're now an approved leader. Let's get you set up to attract followers and start earning.",
      icon: Crown,
      completed: true,
    },
    {
      id: "markets",
      title: "Add Trading Markets",
      description: "Select which markets you'll be trading. Followers need to know where to allocate their funds.",
      icon: Coins,
      completed: hasMarkets,
      action: {
        label: "Add Markets",
        onClick: () => onNavigateToTab("markets"),
      },
    },
    {
      id: "profile",
      title: "Complete Your Profile",
      description: "Add a compelling bio to tell potential followers about your trading strategy and experience.",
      icon: Settings,
      completed: hasBio,
      action: {
        label: "Edit Profile",
        onClick: () => onNavigateToTab("settings"),
      },
    },
    {
      id: "visibility",
      title: "Make Profile Public",
      description: "Your profile needs to be public for traders to discover and follow you.",
      icon: Users,
      completed: isPublic,
      action: {
        label: isPublic ? "Already Public" : "Go Public",
        onClick: () => onNavigateToTab("settings"),
      },
    },
    {
      id: "trade",
      title: "Make Your First Trade",
      description: "Start trading! Your trades will automatically be available for followers to copy.",
      icon: TrendingUp,
      completed: hasFirstTrade,
      action: {
        label: "Go to Trade",
        href: "/trade",
      },
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const progressPercent = (completedCount / steps.length) * 100;

  // Tips for leaders
  const tips = [
    {
      icon: Target,
      title: "Be Consistent",
      description: "Maintain a consistent trading strategy. Followers appreciate predictability.",
    },
    {
      icon: Shield,
      title: "Manage Risk",
      description: "Use proper risk management. Your followers' capital depends on your decisions.",
    },
    {
      icon: BarChart3,
      title: "Build Track Record",
      description: "The more profitable trades you make, the more followers you'll attract.",
    },
    {
      icon: Gift,
      title: "Competitive Fees",
      description: "Lower profit share percentages can attract more followers initially.",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="mb-8"
    >
      <Card className="border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-orange-500/5 to-transparent overflow-hidden">
        <CardContent className="p-0">
          {/* Header */}
          <div className="relative p-6 pb-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-b border-amber-500/20">
            <button
              onClick={onDismiss}
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 transition-colors"
            >
              <X className="h-4 w-4 text-zinc-500" />
            </button>

            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg">
                <Rocket className="h-8 w-8 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                    {tExt("getting_started")} {leaderProfile.displayName}!
                  </h2>
                  <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border-0">
                    {t("new_leader")}
                  </Badge>
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {t("complete_these_steps_to_start_attracting_followers")}
                </p>
              </div>
            </div>

            {/* Progress */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-zinc-600 dark:text-zinc-400">{t("setup_progress")}</span>
                <span className="font-semibold text-amber-600">{completedCount}/{steps.length} completed</span>
              </div>
              <Progress value={progressPercent} className="h-2 bg-zinc-200 dark:bg-zinc-700" />
            </div>
          </div>

          {/* Steps */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {steps.map((step, index) => (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`relative p-4 rounded-xl border-2 transition-all ${
                    step.completed
                      ? "border-emerald-500/50 bg-emerald-500/5"
                      : index === steps.findIndex((s) => !s.completed)
                      ? "border-amber-500 bg-amber-500/5 shadow-md"
                      : "border-zinc-200 dark:border-zinc-700 opacity-60"
                  }`}
                >
                  {/* Step number indicator */}
                  <div className="absolute -top-2 -left-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      step.completed
                        ? "bg-emerald-500 text-white"
                        : "bg-zinc-300 dark:bg-zinc-600 text-zinc-600 dark:text-zinc-300"
                    }`}>
                      {step.completed ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                    </div>
                  </div>

                  <div className="text-center">
                    <div className={`w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center ${
                      step.completed
                        ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                        : "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                    }`}>
                      <step.icon className="h-5 w-5" />
                    </div>
                    <h4 className="text-sm font-semibold mb-1 text-zinc-900 dark:text-white">
                      {step.title}
                    </h4>
                    <p className="text-xs text-zinc-500 mb-3 line-clamp-2">
                      {step.description}
                    </p>

                    {step.action && !step.completed && (
                      step.action.href ? (
                        <Link href={step.action.href}>
                          <Button size="sm" variant="outline" className="w-full text-xs rounded-lg">
                            {step.action.label}
                            <ChevronRight className="h-3 w-3 ml-1" />
                          </Button>
                        </Link>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full text-xs rounded-lg"
                          onClick={step.action.onClick}
                        >
                          {step.action.label}
                          <ChevronRight className="h-3 w-3 ml-1" />
                        </Button>
                      )
                    )}

                    {step.completed && (
                      <Badge variant="outline" className="text-emerald-600 border-emerald-500/50 text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Done
                      </Badge>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Tips Section */}
          <div className="px-6 pb-6">
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                <Sparkles className="h-4 w-4 text-amber-500" />
                {t("pro_tips_for_success")}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {tips.map((tip, index) => (
                  <div key={index} className="text-center">
                    <div className="w-8 h-8 rounded-lg bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center mx-auto mb-2">
                      <tip.icon className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                    </div>
                    <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{tip.title}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{tip.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 pb-6 flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="text-zinc-500"
            >
              {t("dismiss_for_now")}
            </Button>
            <Link
              href="/copy-trading/guide/leader"
              className="flex items-center gap-2 text-xs text-zinc-500 hover:text-amber-500 transition-colors"
            >
              <BookOpen className="h-4 w-4" />
              {t("need_help_check_our_leader_guide")}
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
