"use client";

import { useState } from "react";
import { Link } from "@/i18n/routing";
import {
  ArrowLeft,
  Compass,
  Sparkles,
  Shield,
  Zap,
  Users,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GuidedMatchingWizard } from "./components/guided-matching-wizard";
import { MatchingResults } from "./components/matching-results";
import { useTranslations } from "next-intl";

export function GuidedMatchingPage() {
  const t = useTranslations("ext");
  const [wizardComplete, setWizardComplete] = useState(false);
  const [matchingCriteria, setMatchingCriteria] = useState<any>(null);

  const handleWizardComplete = (criteria: any) => {
    setMatchingCriteria(criteria);
    setWizardComplete(true);
  };

  const handleStartOver = () => {
    setWizardComplete(false);
    setMatchingCriteria(null);
  };

  return (
    <div className="min-h-screen container">
      <main className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-8">
        {/* Header with back button */}
        <div className="flex items-center gap-2">
          <Link href="/p2p/offer">
            <Button variant="outline" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("guided_order_matching")}
          </h1>
        </div>
        {/* Hero Section - Improved for Dark Mode */}
        <div className="relative overflow-hidden rounded-xl border border-primary/20 dark:border-primary/30 bg-zinc-50 dark:bg-zinc-900/50 p-6 md:p-8">
          <div className="space-y-6">
            <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary w-fit">
              <Sparkles className="h-3.5 w-3.5 mr-2" />
              {t("smart_matching_technology")}
            </div>
            <h2 className="text-4xl font-bold tracking-tight">
              {t("find_your_perfect")}{" "}
              <span className="text-primary">{t("crypto_trade")}</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-md">
              {t("our_intelligent_matching_exact_preferences")}.
            </p>

            <div className="flex flex-wrap gap-4 pt-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Zap className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm">{t("best_rates")}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Shield className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm">{t("100%_secure")}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm">{t("fast_matching")}</span>
              </div>
            </div>
          </div>
        </div>
        {/* Main Content - Improved for Dark Mode */}
        <Card className="border-primary/10 dark:border-primary/20 overflow-hidden">
          <CardHeader className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-primary/10 dark:border-primary/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl">
                    {wizardComplete
                      ? "Your Matching Results"
                      : "Tell Us What You Need"}
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    {wizardComplete
                      ? "Based on your preferences, we've found these offers for you"
                      : "Answer a few questions to help us find the perfect trading offers for you"}
                  </CardDescription>
                </div>
              </div>
              <Badge
                variant="outline"
                className="bg-primary/10 text-primary border-primary/20 dark:border-primary/30 flex items-center gap-1 px-3 py-1.5"
              >
                <Sparkles className="h-3.5 w-3.5 mr-1" />
                {t("smart_match")}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {!wizardComplete ? (
              <GuidedMatchingWizard onComplete={handleWizardComplete} />
            ) : (
              <MatchingResults
                criteria={matchingCriteria}
                onStartOver={handleStartOver}
              />
            )}
          </CardContent>
        </Card>
        {/* Benefits Section - Only show when wizard is not complete - Improved for Dark Mode */}
        {!wizardComplete && (
          <div className="space-y-8 py-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">
                {t("why_use_guided_matching")}
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                {t("our_intelligent_system_key_benefits")}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <Card className="border-zinc-200 dark:border-zinc-700/50 dark:bg-zinc-900/50">
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                      <Compass className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold">
                      {t("smart_recommendations")}
                    </h3>
                    <p className="text-muted-foreground">
                      {t("our_ai-powered_algorithm_trading_preferences")}.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Feature 2 */}
              <Card className="border-zinc-200 dark:border-zinc-700/50 dark:bg-zinc-900/50">
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                      <Users className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold">
                      {t("verified_traders_only")}
                    </h3>
                    <p className="text-muted-foreground">
                      {t("we_prioritize_offers_community_feedback")}.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Feature 3 */}
              <Card className="border-zinc-200 dark:border-zinc-700/50 dark:bg-zinc-900/50">
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                      <Shield className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold">
                      {t("100%_secure_trading")}
                    </h3>
                    <p className="text-muted-foreground">
                      {t("every_transaction_is_the_process")}.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
