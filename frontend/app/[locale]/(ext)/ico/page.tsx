"use client";

import type { Metadata } from "next";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ActiveTokenOfferings } from "@/app/[locale]/(ext)/ico/offer/components/active-offers";
import { UpcomingTokenOfferings } from "@/app/[locale]/(ext)/ico/offer/components/upcoming-offers";
import { HowItWorks } from "@/app/[locale]/(ext)/ico/components/landing/how-it-works";
import { FeaturedProjects } from "@/app/[locale]/(ext)/ico/components/landing/featured-projects";
import {
  ArrowRight,
  Shield,
  TrendingUp,
  Users,
  Zap,
  CheckCircle,
} from "lucide-react";
import { Link } from "@/i18n/routing";
import { useUserStore } from "@/store/user";
import { useConfigStore } from "@/store/config";
import KycRequiredNotice from "@/components/blocks/kyc/kyc-required-notice";
import { useTranslations } from "next-intl";

export default function Home() {
  const t = useTranslations("ext");
  const { hasKyc, canAccessFeature } = useUserStore();
  const { settings } = useConfigStore();
  const [stats, setStats] = useState<{
    projectsLaunched: number;
    totalRaised: number;
    totalInvestors: number;
  } | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    setStatsLoading(true);
    fetch("/api/ico/stats")
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch(() => setStats(null))
      .finally(() => setStatsLoading(false));
  }, []);

  // "Trusted" bar: only show if >10 investors & >10k raised & >2 projects
  const showTrustedBar =
    !!stats &&
    stats.totalInvestors > 10 &&
    stats.totalRaised > 10_000 &&
    stats.projectsLaunched > 2;

  const kycEnabled = settings?.kycStatus === true || settings?.kycStatus === "true";
  const hasAccess = hasKyc() && canAccessFeature("view_ico");

  if (kycEnabled && !hasAccess) {
    return <KycRequiredNotice feature="view_ico" />;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative w-full py-20 md:py-28 lg:py-36 overflow-hidden bg-linear-to-br from-background via-background to-primary/5">
          {/* Decorative elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
            <div className="absolute top-1/2 -left-24 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
          </div>

          <div className="container px-4 md:px-6 relative z-10">
            <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
              <div className="space-y-6">
                <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-sm font-semibold transition-colors focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary text-primary-foreground hover:bg-primary/80 mb-4">
                  <span className="text-xs">
                    {showTrustedBar
                      ? `Trusted by ${stats!.totalInvestors.toLocaleString()}+ investors`
                      : "The #1 Regulated ITO Platform"}
                  </span>
                </div>

                <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
                  {t("the_future_of")}{" "}
                  <span className="text-primary">{t("token_offerings")}</span>
                </h1>

                <p className="max-w-[600px] text-muted-foreground text-lg md:text-xl">
                  {t("discover_invest_and_ito_platform")}{" "}
                  {t("secure_transparent_and_regulated")}
                </p>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="/ico/offer">
                    <Button size="lg" className="w-full sm:w-auto">
                      {t("explore_offerings")}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/ico/creator/launch">
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full sm:w-auto"
                    >
                      {t("launch_your_token")}
                    </Button>
                  </Link>
                </div>

                {/* Dynamic Stats Bar */}
                {statsLoading ? (
                  <div className="h-10 mt-4 w-52 rounded bg-muted animate-pulse" />
                ) : (
                  showTrustedBar && (
                    <div className="flex items-center space-x-4 pt-4">
                      <div className="flex -space-x-2">
                        {[1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className="h-8 w-8 rounded-full border-2 border-background overflow-hidden"
                          >
                            <Image
                              src={"/img/placeholder.svg"}
                              alt={`User ${i}`}
                              width={32}
                              height={32}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">
                          {stats.projectsLaunched}+
                        </span>{" "}
                        {t("projects_launched_this_year")}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">
                          {stats.totalInvestors.toLocaleString()}
                        </span>{" "}
                        {t("investors")}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">
                          / $
                          {stats.totalRaised.toLocaleString(undefined, {
                            maximumFractionDigits: 0,
                          })}
                          +
                        </span>{" "}
                        {t("total_raised")}
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Trust indicators section */}
        <section className="w-full py-12 border-y bg-muted/30">
          <div className="container px-4 md:px-6">
            <div className="flex flex-wrap justify-between items-center gap-8">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <span className="font-medium">{t("fully_regulated")}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                <span className="font-medium">{t("verified_projects")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                <span className="font-medium">{t("instant_trading")}</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <span className="font-medium">{t("high_roi")}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Projects Section */}
        <FeaturedProjects />

        {/* How It Works Section */}
        <HowItWorks />

        {/* Active Token Offerings Section */}
        <section className="w-full py-16 md:py-24">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-10">
              <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary/10 text-primary">
                {t("live_now")}
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  {t("active_token_offerings")}
                </h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  {t("participate_in_these_they_end")}
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-6xl items-center gap-6 py-6 lg:grid-cols-1">
              <ActiveTokenOfferings />
            </div>
            <div className="flex justify-center mt-8">
              <Link href="/ico/offer">
                <Button variant="outline" size="lg">
                  {t("view_all_offerings")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Upcoming Offerings Section */}
        <section className="w-full py-16 md:py-24 bg-muted/30">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-10">
              <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary/10 text-primary">
                {t("coming_soon")}
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  {t("upcoming_offerings")}
                </h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  {t("get_ready_for_these_exciting_token_launches")}
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-6xl items-center gap-6 py-6 lg:grid-cols-3">
              <UpcomingTokenOfferings />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
