"use client";

import React, { useEffect } from "react";
import { notFound, useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { InvestmentForm } from "./components/investment-form";
import { TokenDetails } from "./components/token-details";
import { TeamMembers } from "./components/team-members";
import { Roadmap } from "./components/roadmap";
import { formatCurrency, formatDate } from "@/lib/ico/utils";
import { Link, useRouter } from "@/i18n/routing";
import {
  ArrowLeft,
  Calendar,
  Users,
  DollarSign,
  ChevronRight,
  Sparkles,
  TrendingUp,
  Shield,
  Zap,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOfferStore } from "@/store/ico/offer/offer-store";
import { useConfigStore } from "@/store/config";
import OfferingLoading from "./loading";
import { useUserStore } from "@/store/user";
import KycRequiredNotice from "@/components/blocks/kyc/kyc-required-notice";
import { useTranslations } from "next-intl";

export default function OfferingPage() {
  const t = useTranslations("ext");
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { offering, isLoading, error, fetchOffering, reset } = useOfferStore();
  const { settings } = useConfigStore();
  const { hasKyc, canAccessFeature } = useUserStore();

  // Feature/kyc gating
  const kycEnabled = settings?.kycStatus === true || settings?.kycStatus === "true";
  const hasIcoPurchaseAccess = hasKyc() && canAccessFeature("purchase_ico");

  useEffect(() => {
    fetchOffering(id);
    return () => {
      reset();
    };
  }, [id]);

  if (kycEnabled && !hasIcoPurchaseAccess) {
    // Show feature-specific KYC/permission message
    return <KycRequiredNotice feature="purchase_ico" />;
  }

  // Handle loading state
  if (isLoading || !offering) {
    return <OfferingLoading />;
  }

  // Handle error state
  if (error) {
    return (
      <div className="container py-10">
        <div className="flex flex-col space-y-4 items-center justify-center min-h-[60vh]">
          <div className="p-4 bg-red-500/10 text-red-500 rounded-lg">
            {error || "Offering not found"}
          </div>
          <Button onClick={() => router.push("/ico/offer")}>
            {t("back_to_offerings")}
          </Button>
        </div>
      </div>
    );
  }

  // Calculate progress, days left, and daily raise using offering data
  const currentRaised = offering.currentRaised ?? 0;
  const targetAmount = offering.targetAmount ?? 1; // Avoid division by zero
  const progress = (currentRaised / targetAmount) * 100;
  const daysLeft = Math.ceil(
    (new Date(offering.endDate).getTime() - new Date().getTime()) /
      (1000 * 60 * 60 * 24)
  );
  const raisedPerDay =
    currentRaised /
    Math.max(
      1,
      (new Date().getTime() - new Date(offering.startDate).getTime()) /
        (1000 * 60 * 60 * 24)
    );

  return (
    <>
      {/* Hero Section with Background */}
      <div className="relative bg-gradient-to-b from-primary/10 to-background pt-8 pb-6">
        <div className="container">
          <Link
            href="/ico/offer"
            className="text-sm text-muted-foreground hover:text-primary mb-4 flex items-center w-fit"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            {t("back_to_offerings")}
          </Link>

          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="w-full md:w-2/3">
              <div className="flex items-start gap-2 justify-between">
                <div className="flex items-center gap-5 mb-4">
                  <div className="bg-primary/10 p-1 rounded-full h-24 w-24">
                    <img
                      src={offering.icon || "/img/placeholder.svg"}
                      alt={offering.name}
                      className="object-cover rounded-full w-full h-full"
                    />
                  </div>
                  <div>
                    <h1 className="text-3xl md:text-4xl font-bold">
                      {offering.name}
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xl text-muted-foreground">
                        {offering.symbol}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 mb-3 mt-4">
                  <Badge
                    variant={
                      offering.status === "ACTIVE" ? "default" : "outline"
                    }
                    className={
                      offering.status === "ACTIVE"
                        ? "bg-primary/10 text-primary hover:bg-primary/20"
                        : ""
                    }
                  >
                    {offering.status === "ACTIVE" ? "Active" : offering.status}
                  </Badge>
                  {offering.featured && (
                    <Badge
                      variant="secondary"
                      className="bg-amber-500/10 text-amber-500 border-amber-500/20"
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      {t("Featured")}
                    </Badge>
                  )}
                </div>
              </div>

              <p className="text-muted-foreground max-w-3xl text-base md:text-lg">
                {offering.tokenDetail?.description}
              </p>

              <div className="flex flex-wrap gap-4 mt-6">
                {offering.website && (
                  <Link
                    href={offering.website}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="lg" className="gap-2">
                      {t("visit_website")}
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </Link>
                )}
              </div>
            </div>

            <div className="w-full md:w-1/3 mt-4 md:mt-0">
              <Card className="bg-card/70 backdrop-blur-sm border-primary/10 shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">
                    {t("funding_progress")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium">
                          {progress.toFixed(1)}
                          {t("%_complete")}
                        </span>
                        <span className="text-sm font-medium">
                          {daysLeft}
                          {t("days_left")}
                        </span>
                      </div>
                      <Progress
                        value={progress}
                        className="h-3 bg-primary/10"
                      />
                      <div className="flex justify-between mt-2">
                        <span className="text-sm text-muted-foreground">
                          {t("raised")}
                          {formatCurrency(offering.currentRaised ?? 0)}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {t("goal")}
                          {formatCurrency(offering.targetAmount)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="bg-background/50 p-3 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1 flex items-center">
                          <Users className="h-3 w-3 mr-1" />
                          {t("Participants")}
                        </p>
                        <p className="font-medium">
                          {offering.participants.toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-background/50 p-3 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1 flex items-center">
                          <DollarSign className="h-3 w-3 mr-1" />
                          {t("token_price")}
                        </p>
                        <p className="font-medium">
                          {formatCurrency(offering.tokenPrice)}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-0">
                  <Link href="#invest">
                    <Button className="w-full" size="lg">
                      {t("invest_now")}
                      <Zap className="ml-1 h-4 w-4" />
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              <Card className="bg-primary/5 border-0">
                <CardContent className="p-4">
                  <DollarSign className="h-5 w-5 text-primary mb-2" />
                  <p className="text-xs text-muted-foreground">
                    {t("Min")}. {t("Investment")}
                  </p>
                  <p className="font-semibold">
                    {formatCurrency(settings["icoMinInvestmentAmount"])}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-primary/5 border-0">
                <CardContent className="p-4">
                  <Calendar className="h-5 w-5 text-primary mb-2" />
                  <p className="text-xs text-muted-foreground">
                    {t("end_date")}
                  </p>
                  <p className="font-semibold">
                    {formatDate(offering.endDate)}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-primary/5 border-0">
                <CardContent className="p-4">
                  <TrendingUp className="h-5 w-5 text-primary mb-2" />
                  <p className="text-xs text-muted-foreground">
                    {t("daily_raise")}
                  </p>
                  <p className="font-semibold">
                    {formatCurrency(raisedPerDay)}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-primary/5 border-0">
                <CardContent className="p-4">
                  <Target className="h-5 w-5 text-primary mb-2" />
                  <p className="text-xs text-muted-foreground">{t("Target")}</p>
                  <p className="font-semibold">
                    {formatCurrency(offering.targetAmount)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Information Tabs */}
            <Card className="border-0 shadow-md mb-8">
              <Tabs defaultValue="details" className="w-full">
                <CardHeader className="pb-0">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="details">
                      {t("project_details")}
                    </TabsTrigger>
                    <TabsTrigger value="team">{t("Team")}</TabsTrigger>
                    <TabsTrigger value="roadmap">{t("Roadmap")}</TabsTrigger>
                  </TabsList>
                </CardHeader>
                <CardContent className="pt-6">
                  <TabsContent value="details" className="space-y-6">
                    <TokenDetails details={offering.tokenDetail} />
                  </TabsContent>
                  <TabsContent value="team" className="space-y-6">
                    <TeamMembers members={offering.teamMembers} />
                  </TabsContent>
                  <TabsContent value="roadmap" className="space-y-6">
                    <Roadmap items={offering.roadmapItems} />
                  </TabsContent>
                </CardContent>
              </Tabs>
            </Card>

            {/* FAQ Section */}
            <Card className="border-0 shadow-md mb-8">
              <CardHeader>
                <CardTitle>{t("frequently_asked_questions")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-medium">
                    {t("what_is")}
                    {offering.name}?
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {offering.tokenDetail?.description}
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-medium">
                    {t("how_can_i_participate_in_this_offering")}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t("you_can_participate_by_investing_a_minimum_of")}{" "}
                    {formatCurrency(settings["icoMinInvestmentAmount"])}
                    {t("using_the_investment_form_on_this_page")}.{" "}
                    {t("the_offering_is_open_until")}{" "}
                    {formatDate(offering.endDate)}
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-medium">
                    {t("what_happens_after_i_invest")}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t("after_investing_youll_your_investment")}.{" "}
                    {t("once_the_offering_distribution_schedule")}.
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-medium">
                    {t("is_there_a_lock-up_period")}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t("token_lock-up_periods_vary_by_project")}.{" "}
                    {t("please_refer_to_periods_for")}
                    {offering.name}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Investment Form Column */}
          <div className="space-y-6" id="invest">
            <div className="sticky top-22">
              <InvestmentForm offering={offering} />
              {/* Trust Indicators */}
              <Card className="mt-6 border-0 bg-muted/30">
                <CardContent className="p-4">
                  <h3 className="font-medium text-sm mb-3 flex items-center">
                    <Shield className="h-4 w-4 mr-2 text-primary" />
                    {t("why_invest_with_us")}
                  </h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start">
                      <CheckCircleIcon className="h-4 w-4 mr-2 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>
                        {t("secure_and_transparent_investment_process")}
                      </span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircleIcon className="h-4 w-4 mr-2 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{t("verified_project_teams_and_offerings")}</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircleIcon className="h-4 w-4 mr-2 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{t("detailed_due_diligence_on_all_projects")}</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircleIcon className="h-4 w-4 mr-2 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{t("24_7_customer_support_for_investors")}</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              {/* Activity Feed */}
              <Card className="mt-6 border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    {t("recent_activity")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Users className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {t("new_investor_joined")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t("3_minutes_ago")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                        <DollarSign className="h-4 w-4 text-green-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {formatCurrency(1250)}
                          {t("invested")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t("15_minutes_ago")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                        <Zap className="h-4 w-4 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {t("milestone_reached_75%")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t("2_hours_ago")}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Helper component for check icons
function CheckCircleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
