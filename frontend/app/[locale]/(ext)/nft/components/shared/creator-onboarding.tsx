"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  Circle,
  ArrowRight,
  Package,
  Rocket,
  ImagePlus,
  Sparkles,
  X,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { useState } from "react";
import { useTranslations } from "next-intl";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  current: boolean;
  action?: {
    label: string;
    href: string;
  };
  icon: any;
}

interface CreatorOnboardingProps {
  hasCollections: boolean;
  hasDeployedCollections: boolean;
  hasNFTs: boolean;
  totalCollections?: number;
  deployedCount?: number;
  undeployedCount?: number;
  totalNFTs?: number;
}

export function CreatorOnboarding({
  hasCollections,
  hasDeployedCollections,
  hasNFTs,
  totalCollections = 0,
  deployedCount = 0,
  undeployedCount = 0,
  totalNFTs = 0,
}: CreatorOnboardingProps) {
  const t = useTranslations("ext_nft");
  const tCommon = useTranslations("common");
  const [isDismissed, setIsDismissed] = useState(false);

  // Calculate onboarding steps
  const steps: OnboardingStep[] = [
    {
      id: "create-collection",
      title: "Create Your First Collection",
      description: "Collections organize your NFTs and define their blockchain",
      completed: hasCollections,
      current: !hasCollections,
      action: !hasCollections
        ? {
            label: "Create Collection",
            href: "/nft/collection/create",
          }
        : undefined,
      icon: Package,
    },
    {
      id: "deploy-collection",
      title: "Deploy to Blockchain",
      description: "Deploy your collection to make it permanent on-chain",
      completed: hasDeployedCollections,
      current: hasCollections && !hasDeployedCollections,
      action:
        hasCollections && !hasDeployedCollections
          ? {
              label: "Deploy Collection",
              href: "/nft/creator?tab=collections",
            }
          : undefined,
      icon: Rocket,
    },
    {
      id: "create-nfts",
      title: "Create or Import NFTs",
      description: "Mint your first NFT or batch import multiple",
      completed: hasNFTs,
      current: hasDeployedCollections && !hasNFTs,
      action:
        hasDeployedCollections && !hasNFTs
          ? {
              label: "Create NFT",
              href: "/nft/create",
            }
          : undefined,
      icon: ImagePlus,
    },
  ];

  const completedSteps = steps.filter((s) => s.completed).length;
  const totalSteps = steps.length;
  const progressPercentage = (completedSteps / totalSteps) * 100;
  const isComplete = completedSteps === totalSteps;
  const currentStepIndex = steps.findIndex((s) => s.current);

  // Don't show if dismissed or complete
  if (isDismissed || isComplete) {
    return null;
  }

  return (
    <Card className="mb-8 border-2 border-primary/20 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 shadow-lg">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-full">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold flex items-center gap-2">
                {t("welcome_to_your_creator_journey")}
                <Badge variant="secondary" className="text-xs">
                  {completedSteps}/{totalSteps} Complete
                </Badge>
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {t("follow_these_steps_to_start_creating")}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDismissed(true)}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <Progress value={progressPercentage} className="h-2 mb-2" />
          <p className="text-xs text-muted-foreground">
            {progressPercentage.toFixed(0)}{tCommon("complete")}
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={step.id}
                className={`relative p-4 rounded-lg border-2 transition-all ${
                  step.completed
                    ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900"
                    : step.current
                    ? "bg-white dark:bg-zinc-900 border-blue-400 dark:border-blue-600 shadow-md ring-2 ring-blue-200 dark:ring-blue-900/50"
                    : "bg-white/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 opacity-60"
                }`}
              >
                {/* Step Number & Status */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        step.completed
                          ? "bg-emerald-500 dark:bg-emerald-600 text-white"
                          : step.current
                          ? "bg-blue-600 dark:bg-blue-600 text-white"
                          : "bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
                      }`}
                    >
                      {step.completed ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <span className="text-sm font-semibold">{index + 1}</span>
                      )}
                    </div>
                    <Icon
                      className={`h-5 w-5 ${
                        step.completed
                          ? "text-emerald-600 dark:text-emerald-400"
                          : step.current
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-muted-foreground"
                      }`}
                    />
                  </div>
                  {step.completed && (
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                      Done
                    </Badge>
                  )}
                  {step.current && (
                    <Badge className="bg-purple-600 dark:bg-purple-600 text-white border-0">Current</Badge>
                  )}
                </div>

                {/* Content */}
                <h4 className="font-semibold mb-2">{step.title}</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  {step.description}
                </p>

                {/* Action Button */}
                {step.action && (
                  <Link href={step.action.href}>
                    <Button
                      size="sm"
                      className={`w-full ${
                        step.current
                          ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0"
                          : ""
                      }`}
                      variant={step.current ? "default" : "outline"}
                    >
                      {step.action.label}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                )}

                {/* Stats for completed steps */}
                {step.completed && step.id === "create-collection" && (
                  <div className="mt-3 pt-3 border-t border-emerald-200 dark:border-emerald-900">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{t("collections")}</span>
                      <span className="font-semibold">{totalCollections}</span>
                    </div>
                    {undeployedCount > 0 && (
                      <div className="flex items-center justify-between text-xs mt-1">
                        <span className="text-amber-600 dark:text-amber-400">
                          {t("pending_deployment")}
                        </span>
                        <span className="font-semibold text-amber-600 dark:text-amber-400">
                          {undeployedCount}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {step.completed && step.id === "deploy-collection" && (
                  <div className="mt-3 pt-3 border-t border-emerald-200 dark:border-emerald-900">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{t("deployed")}</span>
                      <span className="font-semibold">{deployedCount}</span>
                    </div>
                  </div>
                )}

                {step.completed && step.id === "create-nfts" && (
                  <div className="mt-3 pt-3 border-t border-emerald-200 dark:border-emerald-900">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{t("total_nfts")}</span>
                      <span className="font-semibold">{totalNFTs}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Additional Actions */}
        {hasDeployedCollections && (
          <div className="mt-6 pt-6 border-t flex flex-col sm:flex-row gap-3">
            <Link href="/nft/create" className="flex-1">
              <Button variant="outline" className="w-full">
                <ImagePlus className="h-4 w-4 mr-2" />
                {t("create_single_nft")}
              </Button>
            </Link>
            <Link href="/nft/batch-mint" className="flex-1">
              <Button variant="outline" className="w-full">
                <Sparkles className="h-4 w-4 mr-2" />
                {t("batch_import_nfts")}
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
