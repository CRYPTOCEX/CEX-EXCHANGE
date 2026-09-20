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
  /**
   * The caller's data is still in flight, so every flag below is a DEFAULT and
   * not an answer.
   *
   * This banner is unusual: whether it exists at all is derived from the
   * response (it self-hides once all three steps are complete). Rendered
   * optimistically it therefore claims a brand-new creator, paints three
   * "not started" steps and a 0% progress bar, and then — for the established
   * creators who make up most of the dashboard's traffic — removes itself,
   * collapsing roughly 450px out of the middle of the page.
   *
   * There is no faithful pending shape for something whose presence is the
   * unknown, so this asserts nothing until it knows. That is a deliberate
   * exception to "render the chrome in both states": the chrome IS the claim.
   */
  loading?: boolean;
  hasCollections: boolean;
  hasDeployedCollections: boolean;
  hasNFTs: boolean;
  totalCollections?: number;
  deployedCount?: number;
  undeployedCount?: number;
  totalNFTs?: number;
}

export function CreatorOnboarding({
  loading = false,
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
  const tExt = useTranslations("ext");
  const [isDismissed, setIsDismissed] = useState(false);

  // Calculate onboarding steps
  const steps: OnboardingStep[] = [
    {
      id: "create-collection",
      title: t("create_your_first_collection"),
      description: t("collections_organize_your_nfts_and_define"),
      completed: hasCollections,
      current: !hasCollections,
      action: !hasCollections
        ? {
            label: t("create_collection"),
            href: "/nft/collection/create",
          }
        : undefined,
      icon: Package,
    },
    {
      id: "deploy-collection",
      title: t("deploy_to_blockchain"),
      description: t("deploy_your_collection_to_make_it"),
      completed: hasDeployedCollections,
      current: hasCollections && !hasDeployedCollections,
      action:
        hasCollections && !hasDeployedCollections
          ? {
              label: t("deploy_collection"),
              href: "/nft/creator?tab=collections",
            }
          : undefined,
      icon: Rocket,
    },
    {
      id: "create-nfts",
      title: t("create_or_import_nfts"),
      description: t("mint_your_first_nft_or_batch_import_multiple"),
      completed: hasNFTs,
      current: hasDeployedCollections && !hasNFTs,
      action:
        hasDeployedCollections && !hasNFTs
          ? {
              label: t("create_nft"),
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

  // Don't show if still resolving (see `loading` above), dismissed, or complete
  if (loading || isDismissed || isComplete) {
    return null;
  }

  return (
    <Card className="mb-8 border-primary/20 bg-primary/5 dark:bg-primary/20">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-sm bg-primary/15 text-primary">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <div>
              <h3 className="text-xl font-semibold leading-tight tracking-tight text-foreground flex items-center gap-2">
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
                    ? "bg-success/5 dark:bg-success/20 border-success/20"
                    : step.current
                    ? "bg-card border-primary ring-2 ring-primary/20 dark:ring-primary/50"
                    : "bg-card/50 dark:bg-surface-2/50 border-border opacity-60"
                }`}
              >
                {/* Step Number & Status */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        step.completed
                          ? "bg-success text-success-foreground"
                          : step.current
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-subtle-foreground"
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
                          ? "text-success"
                          : step.current
                          ? "text-primary"
                          : "text-muted-foreground"
                      }`}
                    />
                  </div>
                  {step.completed && (
                    <Badge variant="secondary" className="bg-success/10 text-success-ink">
                      Done
                    </Badge>
                  )}
                  {step.current && (
                    <Badge className="bg-primary text-primary-foreground border-0">Current</Badge>
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
                          ? "bg-primary hover:bg-primary text-primary-foreground border-0"
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
                  <div className="mt-3 pt-3 border-t border-success/20">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{t("collections")}</span>
                      <span className="font-mono font-semibold tabular-nums text-foreground">{totalCollections}</span>
                    </div>
                    {undeployedCount > 0 && (
                      <div className="flex items-center justify-between text-xs mt-1">
                        <span className="text-warning">
                          {t("pending_deployment")}
                        </span>
                        <span className="font-mono font-semibold tabular-nums text-warning">
                          {undeployedCount}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {step.completed && step.id === "deploy-collection" && (
                  <div className="mt-3 pt-3 border-t border-success/20">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{tExt("deployed")}</span>
                      <span className="font-mono font-semibold tabular-nums text-foreground">{deployedCount}</span>
                    </div>
                  </div>
                )}

                {step.completed && step.id === "create-nfts" && (
                  <div className="mt-3 pt-3 border-t border-success/20">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{tExt("total_nfts")}</span>
                      <span className="font-mono font-semibold tabular-nums text-foreground">{totalNFTs}</span>
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
