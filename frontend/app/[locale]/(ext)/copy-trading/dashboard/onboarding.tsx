"use client";

import { useState } from "react";
import { Link } from "@/i18n/routing";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { m, AnimatePresence } from "framer-motion";
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
  const tCommon = useTranslations("common");
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
      title: t("welcome_to_copy_trading"),
      description: t("youre_now_an_approved_leader_lets"),
      icon: Crown,
      completed: true,
    },
    {
      id: "markets",
      title: t("add_trading_markets"),
      description: t("select_which_markets_youll_be_trading"),
      icon: Coins,
      completed: hasMarkets,
      action: {
        label: t("add_markets"),
        onClick: () => onNavigateToTab("markets"),
      },
    },
    {
      id: "profile",
      title: t("complete_your_profile"),
      description: t("add_a_compelling_bio_to_tell"),
      icon: Settings,
      completed: hasBio,
      action: {
        label: tCommon("edit_profile"),
        onClick: () => onNavigateToTab("settings"),
      },
    },
    {
      id: "visibility",
      title: t("make_profile_public"),
      description: t("your_profile_needs_to_be_public"),
      icon: Users,
      completed: isPublic,
      action: {
        label: isPublic ? t("already_public") : t("go_public"),
        onClick: () => onNavigateToTab("settings"),
      },
    },
    {
      id: "trade",
      title: t("make_your_first_trade"),
      description: t("start_trading_your_trades_will_automatically"),
      icon: TrendingUp,
      completed: hasFirstTrade,
      action: {
        label: t("go_to_trade"),
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
      title: t("be_consistent"),
      description: t("maintain_a_consistent_trading_strategy_followers"),
    },
    {
      icon: Shield,
      title: t("manage_risk"),
      description: t("use_proper_risk_management_your_followers"),
    },
    {
      icon: BarChart3,
      title: t("build_track_record"),
      description: t("the_more_profitable_trades_you_make"),
    },
    {
      icon: Gift,
      title: t("competitive_fees"),
      description: t("lower_profit_share_percentages_can_attract"),
    },
  ];

  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="mb-8"
    >
      <Card className="border border-warning/30 bg-card overflow-hidden">
        <CardContent className="p-0">
          {/* Header */}
          <div className="relative p-6 pb-4 bg-warning/10 border-b border-warning/20">
            <button
              onClick={onDismiss}
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <X className="h-4 w-4 text-subtle-foreground" />
            </button>

            <div className="flex items-center gap-4">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-warning/15 text-warning">
                <Rocket className="h-3.5 w-3.5" />
              </span>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl font-bold text-foreground">
                    {tCommon("getting_started")} {leaderProfile.displayName}!
                  </h2>
                  <Badge className="bg-warning/10 text-warning-ink border-0">
                    {t("new_leader")}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t("complete_these_steps_to_start_attracting_followers")}
                </p>
              </div>
            </div>

            {/* Progress */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">{t("setup_progress")}</span>
                <span className="font-semibold text-warning">{completedCount}/{steps.length} completed</span>
              </div>
              <Progress value={progressPercent} className="h-2 bg-muted" />
            </div>
          </div>

          {/* Steps */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {steps.map((step, index) => (
                <m.div
                  key={step.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`relative p-4 rounded-lg border transition-all ${
                    step.completed
                      ? "border-success/50 bg-success/5"
                      : index === steps.findIndex((s) => !s.completed)
                      ? "border-warning bg-warning/5"
                      : "border-border opacity-60"
                  }`}
                >
                  {/* Step number indicator */}
                  <div className="absolute -top-2 -left-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      step.completed
                        ? "bg-success text-success-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {step.completed ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                    </div>
                  </div>

                  <div className="text-center">
                    <div className={`w-10 h-10 rounded-sm mx-auto mb-2 flex items-center justify-center ${
                      step.completed
                        ? "bg-success/20 text-success-ink"
                        : "bg-warning/20 text-warning-ink"
                    }`}>
                      <step.icon className="h-5 w-5" />
                    </div>
                    <h4 className="text-sm font-semibold mb-1 text-foreground">
                      {step.title}
                    </h4>
                    <p className="text-xs text-subtle-foreground mb-3 line-clamp-2">
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
                      <Badge variant="outline" className="text-success border-success/50 text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Done
                      </Badge>
                    )}
                  </div>
                </m.div>
              ))}
            </div>
          </div>

          {/* Tips Section */}
          <div className="px-6 pb-6">
            <div className="p-4 rounded-lg bg-surface-2 border border-border">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-muted-foreground">
                <Sparkles className="h-4 w-4 text-warning" />
                {t("pro_tips_for_success")}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {tips.map((tip, index) => (
                  <div key={index} className="text-center">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-surface-3 text-muted-foreground mx-auto mb-2">
                      <tip.icon className="h-3.5 w-3.5" />
                    </span>
                    <p className="text-xs font-medium text-muted-foreground">{tip.title}</p>
                    <p className="text-xs text-subtle-foreground mt-0.5">{tip.description}</p>
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
              className="text-subtle-foreground"
            >
              {t("dismiss_for_now")}
            </Button>
            <Link
              href="/copy-trading/guide/leader"
              className="flex items-center gap-2 text-xs text-subtle-foreground hover:text-warning transition-colors"
            >
              <BookOpen className="h-4 w-4" />
              {t("need_help_check_our_leader_guide")}
            </Link>
          </div>
        </CardContent>
      </Card>
    </m.div>
  );
}
