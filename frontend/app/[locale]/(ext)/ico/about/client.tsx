"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { Sparkles, Shield, Eye, Scale, Rocket, TrendingUp, Users } from "lucide-react";
import { HeroSection } from "@/components/ui/hero-section";
import { StatsGroup } from "@/components/ui/stats-group";
import { motion } from "framer-motion";

const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "Bicrypto";

export default function AboutPageClient() {
  const t = useTranslations("ext_ico");
  const tExt = useTranslations("ext");
  const tCommon = useTranslations("common");

  return (
    <div className="min-h-screen bg-linear-to-b from-background via-muted/20 to-background dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950">
      {/* Hero Section */}
      <HeroSection
        badge={{
          icon: <Sparkles className="h-3.5 w-3.5" />,
          text: t("about_us"),
          gradient: "from-teal-500/10 to-cyan-500/10",
          iconColor: "text-teal-500",
          textColor: "text-teal-600 dark:text-teal-400",
        }}
        title={[
          { text: tCommon("about") + " " },
          { text: siteName, gradient: "from-teal-600 via-cyan-500 to-teal-600 dark:from-teal-400 dark:via-cyan-400 dark:to-teal-400" },
        ]}
        description={t("were_building_the_regulated_platform")}
        paddingTop="pt-24"
        paddingBottom="pb-12"
        layout="default"
        background={{
          orbs: [
            {
              color: "#14b8a6",
              position: { top: "-10rem", right: "-10rem" },
              size: "20rem",
            },
            {
              color: "#06b6d4",
              position: { bottom: "-5rem", left: "-5rem" },
              size: "15rem",
            },
          ],
        }}
        particles={{
          count: 6,
          type: "floating",
          colors: ["#14b8a6", "#06b6d4"],
          size: 8,
        }}
      >
        <StatsGroup
          stats={[
            {
              icon: Shield,
              label: tExt("security"),
              value: tExt("first"),
              iconColor: "text-teal-500",
              iconBgColor: "bg-teal-500/10",
            },
            {
              icon: Eye,
              label: t("transparency"),
              value: t("always"),
              iconColor: "text-cyan-500",
              iconBgColor: "bg-cyan-500/10",
            },
            {
              icon: Scale,
              label: t("compliance"),
              value: t("guaranteed"),
              iconColor: "text-teal-500",
              iconBgColor: "bg-teal-500/10",
            },
          ]}
        />
      </HeroSection>

      {/* Content */}
      <div className="container mx-auto py-8 space-y-16">
        {/* Mission & Vision */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center"
        >
          <div className="space-y-4">
            <h2 className="text-3xl font-bold bg-linear-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
              {t("our_mission")}
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              {siteName} {t("was_founded_with_and_compliance")}.
            </p>
            <p className="text-muted-foreground text-lg leading-relaxed">
              {t("we_believe_that_and_investment")}. {t("however_the_space_regulatory_uncertainty")}.
            </p>
            <p className="text-muted-foreground text-lg leading-relaxed">
              {t("our_platform_addresses_with_confidence")}.
            </p>
          </div>

          <Card className="bg-linear-to-br from-teal-500/10 via-cyan-500/5 to-background border-teal-500/20">
            <CardContent className="pt-8 pb-8">
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-teal-500/10 rounded-2xl flex items-center justify-center">
                  <Rocket className="w-8 h-8 text-teal-500" />
                </div>
                <h3 className="text-2xl font-bold">{t("our_vision")}</h3>
                <p className="text-muted-foreground text-lg leading-relaxed max-w-md mx-auto">
                  {t("a_world_where_and_security")}.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Core Values */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="space-y-8"
        >
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold">{t("our_core_values")}</h2>
            <p className="text-muted-foreground text-lg">
              {t("the_principles_that_guide_everything_we_do")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-teal-500/20 hover:border-teal-500/40 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-teal-500/10 rounded-xl flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-teal-500" />
                </div>
                <CardTitle className="text-xl">{tExt("security")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {t("we_prioritize_the_all_else")}. {t("all_projects_undergo_being_listed")}.
                </p>
              </CardContent>
            </Card>

            <Card className="border-cyan-500/20 hover:border-cyan-500/40 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center mb-4">
                  <Eye className="w-6 h-6 text-cyan-500" />
                </div>
                <CardTitle className="text-xl">{t("transparency")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {t("we_believe_in_we_list")}. {t("all_information_is_our_users")}.
                </p>
              </CardContent>
            </Card>

            <Card className="border-teal-500/20 hover:border-teal-500/40 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-teal-500/10 rounded-xl flex items-center justify-center mb-4">
                  <Scale className="w-6 h-6 text-teal-500" />
                </div>
                <CardTitle className="text-xl">{t("compliance")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {t("we_work_within_and_regulations")}.
                </p>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="bg-linear-to-br from-teal-500/10 via-cyan-500/5 to-background border-teal-500/20">
            <CardContent className="pt-12 pb-12">
              <div className="text-center space-y-6">
                <div className="mx-auto w-16 h-16 bg-teal-500/10 rounded-2xl flex items-center justify-center">
                  <Users className="w-8 h-8 text-teal-500" />
                </div>
                <h2 className="text-3xl font-bold">{t("join_our_journey")}</h2>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
                  {t("whether_youre_a_token_offerings")}.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                  <Link href="/ico/creator/launch">
                    <Button
                      size="lg"
                      className="bg-linear-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-600 text-white font-semibold rounded-xl shadow-lg"
                    >
                      <Rocket className="mr-2 h-5 w-5" />
                      {t("launch_your_token")}
                    </Button>
                  </Link>
                  <Link href="/ico/offer">
                    <Button
                      size="lg"
                      variant="outline"
                      className="border-teal-500/20 hover:border-teal-500/40 hover:bg-teal-500/5 rounded-xl font-semibold"
                    >
                      <TrendingUp className="mr-2 h-5 w-5" />
                      {t("explore_offerings")}
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
