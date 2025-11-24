"use client";

import { useParams, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircle,
  ArrowLeft,
  Loader2,
  Users,
  TrendingUp,
  Bell,
  ChevronDown,
  ChevronUp,
  Rocket,
  Shield,
  Calendar,
  DollarSign,
  BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Link, useRouter } from "@/i18n/routing";
import { useCreatorStore } from "@/store/ico/creator/creator-store";
import TokenTeam from "../components/team";
import TokenRoadmap from "../components/roadmap";
import { TokenUpdates } from "../components/updates";
import { useTranslations } from "next-intl";

export default function TokenPageClient() {
  const t = useTranslations("ext");
  const params = useParams();
  const tokenId = params.id as string;
  const router = useRouter();
  const searchParams = useSearchParams();
  const { fetchToken, currentToken, isLoadingToken, tokenError } =
    useCreatorStore();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "team");
  const [showStats, setShowStats] = useState(true);

  // Fetch basic token details for the hero header.
  useEffect(() => {
    if (tokenId) {
      fetchToken(tokenId);
    }
  }, [tokenId]);

  // Update URL when tab changes.
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set("tab", value);
    router.push(`?${newParams.toString()}`, { scroll: false });
  };

  const isTokenLaunched = currentToken?.status === "ACTIVE";
  const planId = currentToken?.plan?.id || currentToken?.planId;

  const getStatusBadge = () => {
    if (!currentToken) return null;
    switch (currentToken.status) {
      case "PENDING":
        return (
          <Badge
            variant="outline"
            className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
          >
            {t("Pending")}
          </Badge>
        );
      case "ACTIVE":
        return (
          <Badge
            variant="outline"
            className="bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200"
          >
            {t("Active")}
          </Badge>
        );
      case "SUCCESS":
        return (
          <Badge
            variant="outline"
            className="bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200"
          >
            {t("Success")}
          </Badge>
        );
      case "FAILED":
        return (
          <Badge
            variant="outline"
            className="bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200"
          >
            {t("Failed")}
          </Badge>
        );
      case "UPCOMING":
        return (
          <Badge
            variant="outline"
            className="bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200"
          >
            {t("Upcoming")}
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge
            variant="outline"
            className="bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200"
          >
            {t("Rejected")}
          </Badge>
        );
      default:
        return null;
    }
  };

  if (isLoadingToken) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (tokenError) {
    return (
      <div className="container py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{tokenError}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!currentToken) {
    return (
      <div className="container py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{t("token_not_found")}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="pb-16">
      {/* Hero Header */}
      <div className="bg-gradient-to-b from-primary/10 to-background pt-8 pb-6">
        <div className="container">
          <Link href="/ico/creator?tab=token">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("back_to_tokens")}
            </Button>
          </Link>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-lg bg-primary/20 flex items-center justify-center">
                {currentToken.icon ? (
                  <img
                    src={currentToken.icon || "/img/placeholder.svg"}
                    alt={currentToken.name}
                    className="h-14 w-14 rounded-lg object-cover"
                  />
                ) : currentToken.symbol ? (
                  <span className="text-2xl font-bold text-primary">
                    {currentToken.symbol.slice(0, 2)}
                  </span>
                ) : (
                  <Rocket className="h-8 w-8 text-primary" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-3xl font-bold">
                    {currentToken.name || "Untitled Token"}
                  </h1>
                  {getStatusBadge()}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground mt-1">
                  {currentToken.symbol && (
                    <span className="font-mono">{currentToken.symbol}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end md:self-auto">
              <Link
                href={`/ico/creator/token/${tokenId}/plan/upgrade?currentPlan=${planId}`}
              >
                <Button>{t("upgrade_plan")}</Button>
              </Link>
              <Link href={`/ico/creator/token/${tokenId}/release`} passHref>
                <Button>{t("manage_token_release")}</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="container mt-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">{t("token_performance")}</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowStats(!showStats)}
            className="flex items-center gap-1"
          >
            {showStats ? (
              <>
                <ChevronUp className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only">Hide Stats</span>
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only">Show Stats</span>
              </>
            )}
          </Button>
        </div>

        <AnimatePresence>
          {showStats && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-primary" />
                      {t("funds_raised")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      ${(currentToken.fundsRaised || 0).toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("target_$")}
                      {(currentToken.fundingGoal || 0).toLocaleString()}
                    </p>
                    {currentToken.fundingGoal && (
                      <div className="mt-2 h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{
                            width: `${Math.min(100, ((currentToken.fundsRaised || 0) / currentToken.fundingGoal) * 100)}%`,
                          }}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      {t("Investors")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {(currentToken.investorsCount || 0).toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("From")}{" "}
                      {currentToken.launchDate
                        ? new Date(currentToken.launchDate).toLocaleDateString()
                        : "launch"}
                    </p>
                    <div className="mt-4 flex items-center gap-2">
                      <Badge variant="outline" className="bg-primary/10">
                        <BarChart3 className="h-3 w-3 mr-1" />
                        {currentToken.status === "ACTIVE"
                          ? "Active"
                          : "Completed"}
                      </Badge>
                      {currentToken.plan?.name && (
                        <Badge variant="outline" className="bg-secondary/10">
                          <Shield className="h-3 w-3 mr-1" />
                          {currentToken.plan?.name.charAt(0).toUpperCase() +
                            currentToken.plan?.name.slice(1)}{" "}
                          {t("Plan")}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      {t("Timeline")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {currentToken.timeline &&
                      currentToken.timeline.length > 0 ? (
                        currentToken.timeline.slice(0, 3).map((event) => (
                          <div
                            key={event.id}
                            className="flex justify-between items-center text-sm"
                          >
                            <span className="text-muted-foreground">
                              {event.title}
                            </span>
                            <span>
                              {new Date(event.date).toLocaleDateString()}
                            </span>
                          </div>
                        ))
                      ) : (
                        <>
                          {currentToken.createdAt && (
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-muted-foreground">
                                {t("Created")}
                              </span>
                              <span>
                                {new Date(
                                  currentToken.createdAt
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                          {currentToken.launchDate && (
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-muted-foreground">
                                {t("Launched")}
                              </span>
                              <span>
                                {new Date(
                                  currentToken.launchDate
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                          {currentToken.endDate && (
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-muted-foreground">
                                {t("Completed")}
                              </span>
                              <span>
                                {new Date(
                                  currentToken.endDate
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {isTokenLaunched && (
        <div className="container mt-2 mb-8">
          <Alert className="border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t("this_token_has_be_edited")}. {t("you_can_still_and_updates")}.
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Main Content */}
      <div className="container pb-20 min-h-[40rem]">
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="team" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">{t("Team")}</span>
            </TabsTrigger>
            <TabsTrigger value="roadmap" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">{t("Roadmap")}</span>
            </TabsTrigger>
            <TabsTrigger value="updates" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">{t("Updates")}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="team" className="mt-0">
            <TokenTeam tokenId={tokenId} />
          </TabsContent>

          <TabsContent value="roadmap" className="mt-0">
            <TokenRoadmap tokenId={tokenId} />
          </TabsContent>

          <TabsContent value="updates" className="mt-0">
            <TokenUpdates tokenId={tokenId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
