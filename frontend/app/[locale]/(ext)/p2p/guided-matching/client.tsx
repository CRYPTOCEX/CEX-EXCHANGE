"use client";

import { useState } from "react";
import {
  Compass,
  Sparkles,
  Shield,
  Zap,
  Users,
  Clock,
} from "lucide-react";
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
import { motion } from "framer-motion";
import { HeroSection } from "@/components/ui/hero-section";
import { StatsGroup } from "@/components/ui/stats-group";

export function GuidedMatchingPage() {
  const t = useTranslations("ext_p2p");
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
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/10 to-background dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950">
      {/* Hero section - Using HeroSection component */}
      <HeroSection
        badge={{
          icon: <Sparkles className="h-3.5 w-3.5" />,
          text: t("smart_matching_technology"),
          gradient: `from-blue-500/10 to-violet-500/10`,
          iconColor: `text-blue-500`,
          textColor: `text-blue-600 dark:text-blue-400`,
        }}
        title={[
          { text: t("find_your_perfect") + " " },
          { text: t("crypto_trade"), gradient: `from-blue-500 via-violet-500 to-blue-600` },
        ]}
        description={t("our_intelligent_matching_exact_preferences") + "."}
        paddingTop="pt-24"
        paddingBottom="pb-16"
        background={{
          orbs: [
            {
              color: "#3b82f6",
              position: { top: "-10rem", right: "-10rem" },
              size: "20rem",
            },
            {
              color: "#8b5cf6",
              position: { bottom: "-5rem", left: "-5rem" },
              size: "15rem",
            },
          ],
        }}
        particles={{
          count: 6,
          type: "floating",
          colors: ["#3b82f6", "#8b5cf6"],
          size: 8,
        }}
      >
        <StatsGroup
          stats={[
            {
              icon: Zap,
              label: t("best_rates"),
              value: "",
              iconColor: `text-blue-500`,
              iconBgColor: `bg-blue-500/10`,
            },
            {
              icon: Shield,
              label: t("n_100_secure"),
              value: "",
              iconColor: `text-blue-500`,
              iconBgColor: `bg-blue-500/10`,
            },
            {
              icon: Clock,
              label: t("fast_matching"),
              value: "",
              iconColor: `text-blue-500`,
              iconBgColor: `bg-blue-500/10`,
            },
          ]}
        />
      </HeroSection>

      <main className="container mx-auto py-12 space-y-8">
        {/* Main Content - Violet theme */}
        <Card className="border-zinc-200/50 dark:border-zinc-700/50 overflow-hidden">
          <CardHeader className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200/50 dark:border-zinc-700/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center`}>
                  <Sparkles className={`h-5 w-5 text-blue-500`} />
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
                className={`bg-blue-500/10 text-blue-500 border-blue-500/20 flex items-center gap-1 px-3 py-1.5 rounded-full`}
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
        {/* Benefits Section - Only show when wizard is not complete - Violet theme */}
        {!wizardComplete && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-8 py-6"
          >
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">
                {t("why_use_guided_matching")}
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                {t("our_intelligent_system_key_benefits")}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Feature 1 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <Card className="h-full border-zinc-200/50 dark:border-zinc-700/50 dark:bg-zinc-900/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className={`w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-2`}>
                        <Compass className={`h-8 w-8 text-blue-500`} />
                      </div>
                      <h3 className="text-xl font-semibold">
                        {t("smart_recommendations")}
                      </h3>
                      <p className="text-muted-foreground">
                        {t("our_ai_powered_algorithm_trading_preferences")}.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Feature 2 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Card className="h-full border-zinc-200/50 dark:border-zinc-700/50 dark:bg-zinc-900/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className={`w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-2`}>
                        <Users className={`h-8 w-8 text-blue-500`} />
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
              </motion.div>

              {/* Feature 3 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <Card className="h-full border-zinc-200/50 dark:border-zinc-700/50 dark:bg-zinc-900/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className={`w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-2`}>
                        <Shield className={`h-8 w-8 text-blue-500`} />
                      </div>
                      <h3 className="text-xl font-semibold">
                        {t("n_100_secure_trading")}
                      </h3>
                      <p className="text-muted-foreground">
                        {t("every_transaction_is_the_process")}.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
