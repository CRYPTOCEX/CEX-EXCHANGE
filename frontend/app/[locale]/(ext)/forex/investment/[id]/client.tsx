"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  Info,
  ArrowLeft,
  TrendingUp,
  Clock,
  DollarSign,
  Sparkles,
  Target,
  BarChart3,
} from "lucide-react";
import {
  formatCurrency,
  formatDate,
  formatDuration,
  formatPercentage,
} from "@/utils/formatters";
import { calculateRemainingTime } from "@/utils/calculations";
import { useToast } from "@/hooks/use-toast";
import InvestmentDetailLoading from "./loading";
import { useParams } from "next/navigation";
import { $fetch } from "@/lib/api";
import { Link } from "@/i18n/routing";
import { motion } from "framer-motion";
export default function InvestmentDetailClient() {
  const { id } = useParams() as {
    id: string;
  };
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [investment, setInvestment] =
    useState<forexInvestmentAttributes | null>(null);
  const [plan, setPlan] = useState<any>(null);
  const [duration, setDuration] = useState<any>(null);
  const [profitProjection, setProfitProjection] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Fetch investment data from API
  const fetchInvestment = async (investmentId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const { data, error: fetchError } = await $fetch({
        url: `/api/forex/investment/${investmentId}`,
        silentSuccess: true,
      });
      if (fetchError) {
        setError(fetchError);
        toast({
          title: "Error",
          description: "Failed to fetch investment details",
          variant: "destructive",
        });
        return null;
      }
      if (!data) {
        setError("Investment not found");
        toast({
          title: "Error",
          description: "Investment not found",
          variant: "destructive",
        });
        return null;
      }
      return data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Load investment data
  useEffect(() => {
    const fetchData = async () => {
      if (!id) {
        setError("Invalid investment ID");
        setIsLoading(false);
        return;
      }

      const fetchedInvestment = await fetchInvestment(id);
      if (fetchedInvestment) {
        setInvestment(fetchedInvestment);

        const relatedPlan = fetchedInvestment.plan;
        const relatedDuration = fetchedInvestment.duration;
        setPlan(relatedPlan);
        setDuration(relatedDuration);

        // Generate profit projection
        const projectionDays = [7, 14, 30, 60, 90];
        const projections = projectionDays.map((days) => {
          const projectedProfit =
            (((fetchedInvestment.amount || 0) *
              (relatedPlan?.profitPercentage || 5)) /
              100) *
            (days / 30);
          return {
            days,
            profit: projectedProfit,
            total: (fetchedInvestment.amount || 0) + projectedProfit,
          };
        });
        setProfitProjection(projections);
      }
    };
    fetchData();
  }, [id, toast]);

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return (
          <Badge className={`bg-emerald-500 text-white`}>
            <CheckCircle className="h-3.5 w-3.5 mr-1" />
            Active
          </Badge>
        );
      case "COMPLETED":
        return (
          <Badge className={`bg-teal-500 text-white`}>
            <CheckCircle className="h-3.5 w-3.5 mr-1" />
            Completed
          </Badge>
        );
      case "CANCELLED":
        return (
          <Badge className="bg-zinc-500 text-white">
            <XCircle className="h-3.5 w-3.5 mr-1" />
            Cancelled
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge className="bg-red-500 text-white">
            <XCircle className="h-3.5 w-3.5 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Get result icon
  const getResultIcon = (result?: string) => {
    switch (result) {
      case "WIN":
        return (
          <CheckCircle className={`h-5 w-5 text-emerald-500`} />
        );
      case "LOSS":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "DRAW":
        return <AlertCircle className="h-5 w-5 text-amber-500" />;
      default:
        return null;
    }
  };

  // Calculate progress
  const calculateProgress = () => {
    if (!investment || !investment.endDate || !investment.createdAt) return 0;
    if (investment.status === "COMPLETED") return 100;
    const now = new Date().getTime();
    const start = new Date(investment.createdAt).getTime();
    const end = new Date(investment.endDate).getTime();
    if (now >= end) return 100;
    return Math.max(0, Math.min(100, ((now - start) / (end - start)) * 100));
  };

  // Calculate remaining time
  const getRemainingTime = () => {
    if (!investment || !investment.endDate)
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        isExpired: true,
      };
    return calculateRemainingTime(
      typeof investment.endDate === "string"
        ? investment.endDate
        : (investment.endDate as any)?.toISOString?.() || ""
    );
  };

  // Handle error state
  if (error) {
    return (
      <div className="min-h-screen bg-linear-to-b from-background via-muted/10 to-background dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950">
        <main className="pt-24 pb-12">
          <div className="container mx-auto">
            <Card className="max-w-md mx-auto border border-red-200 dark:border-red-500/30 shadow-xl bg-white dark:bg-zinc-900">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="h-8 w-8 text-red-500" />
                </div>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
                  Error Loading Investment
                </h2>
                <p className="text-zinc-600 dark:text-zinc-400 mb-6">{error}</p>
                <Button
                  onClick={() => window.location.reload()}
                  className={`rounded-xl bg-linear-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white`}
                >
                  Try Again
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  if (isLoading || !investment) {
    return <InvestmentDetailLoading />;
  }

  const progress = calculateProgress();
  const remainingTime = getRemainingTime();

  return (
    <div className="min-h-screen bg-linear-to-b from-background via-muted/10 to-background dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950">
      <main className="pt-24 pb-12">
        <div className="container mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <Link href="/forex/dashboard">
                <Button
                  variant="outline"
                  size="icon"
                  className={`rounded-xl border-zinc-200 dark:border-zinc-700 hover:bg-emerald-500/5 dark:hover:bg-emerald-500/10 hover:border-emerald-500/30`}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-1">
                  <h1 className="text-2xl md:text-3xl font-bold bg-linear-to-r from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-300 bg-clip-text text-transparent">
                    {plan?.title || plan?.name}
                  </h1>
                  {getStatusBadge(investment.status)}
                </div>
                <p className="text-zinc-600 dark:text-zinc-400">
                  Investment ID: {investment.id.substring(0, 8)}... • Created on{" "}
                  {formatDate(investment.createdAt || "")}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Investment Summary */}
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Status Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <Card className="border border-zinc-200/50 dark:border-zinc-700/50 shadow-xl bg-white dark:bg-zinc-900 overflow-hidden">
                  <div
                    className={`h-1 bg-linear-to-r from-emerald-500 via-teal-500 to-emerald-600`}
                  >
                    <div
                      className="h-full bg-white/30"
                      style={{
                        width: `${100 - progress}%`,
                        marginLeft: `${progress}%`,
                      }}
                    />
                  </div>
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-1">
                          Investment Status
                        </h3>
                        <p className="text-zinc-600 dark:text-zinc-400 text-sm">
                          {investment.status === "ACTIVE"
                            ? "Your investment is active and generating profits."
                            : investment.status === "COMPLETED"
                              ? "Your investment has been completed successfully."
                              : investment.status === "REJECTED"
                                ? "This investment has been rejected."
                                : investment.status === "CANCELLED"
                                  ? "This investment has been cancelled."
                                  : "Your investment is no longer active."}
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        {investment.result && getResultIcon(investment.result)}
                        <span className="font-medium text-zinc-900 dark:text-white">
                          {investment.status === "REJECTED"
                            ? "Rejected"
                            : investment.status === "CANCELLED"
                              ? "Cancelled"
                              : investment.status === "COMPLETED"
                                ? "Completed"
                                : investment.result || "In Progress"}
                        </span>
                      </div>
                    </div>

                    {investment.status === "ACTIVE" && (
                      <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-700">
                        <div className="grid sm:grid-cols-3 gap-6">
                          <div>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">
                              Progress
                            </p>
                            <div className="flex items-center gap-3">
                              <Progress
                                value={progress}
                                className={`h-2 flex-1 **:[[role=progressbar]]:bg-emerald-500`}
                              />
                              <span
                                className={`text-sm font-semibold text-emerald-600 dark:text-emerald-400`}
                              >
                                {Math.round(progress)}%
                              </span>
                            </div>
                          </div>

                          <div>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">
                              Time Remaining
                            </p>
                            <p className="font-semibold text-zinc-900 dark:text-white">
                              {remainingTime.isExpired
                                ? "Completing soon..."
                                : `${remainingTime.days}d ${remainingTime.hours}h ${remainingTime.minutes}m`}
                            </p>
                          </div>

                          <div>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">
                              End Date
                            </p>
                            <p className="font-semibold text-zinc-900 dark:text-white">
                              {formatDate(investment.endDate || "")}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Details Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Card className="border border-zinc-200/50 dark:border-zinc-700/50 shadow-xl bg-white dark:bg-zinc-900">
                  <CardHeader>
                    <CardTitle className="flex items-center text-zinc-900 dark:text-white">
                      <div
                        className={`w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mr-3`}
                      >
                        <BarChart3
                          className={`h-5 w-5 text-emerald-500`}
                        />
                      </div>
                      Investment Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid sm:grid-cols-3 gap-6">
                      <div
                        className={`bg-emerald-500/5 dark:bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/20 dark:border-emerald-500/20`}
                      >
                        <p
                          className={`text-sm text-emerald-600 dark:text-emerald-400 mb-1`}
                        >
                          Investment Amount
                        </p>
                        <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                          {formatCurrency(investment.amount || 0)}
                        </p>
                      </div>

                      <div
                        className={`bg-teal-500/5 dark:bg-teal-500/10 rounded-xl p-4 border border-teal-500/20 dark:border-teal-500/20`}
                      >
                        <p
                          className={`text-sm text-teal-600 dark:text-teal-400 mb-1`}
                        >
                          Profit
                        </p>
                        <p
                          className={`text-2xl font-bold text-emerald-600 dark:text-emerald-400`}
                        >
                          {formatCurrency(investment.profit || 0)}
                        </p>
                      </div>

                      <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-4 border border-zinc-100 dark:border-zinc-700">
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">
                          Total Return
                        </p>
                        <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                          {formatCurrency(
                            (investment.amount || 0) + (investment.profit || 0)
                          )}
                        </p>
                      </div>
                    </div>

                    <Separator className="my-6" />

                    <div className="grid sm:grid-cols-3 gap-6">
                      <div>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">
                          Profit Rate
                        </p>
                        <p className="font-semibold text-zinc-900 dark:text-white">
                          {plan?.profitPercentage
                            ? formatPercentage(plan.profitPercentage)
                            : "N/A"}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">
                          Duration
                        </p>
                        <p className="font-semibold text-zinc-900 dark:text-white">
                          {duration
                            ? formatDuration(duration.duration, duration.timeframe)
                            : "N/A"}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">
                          Currency
                        </p>
                        <p className="font-semibold text-zinc-900 dark:text-white">
                          {plan?.currency || "USD"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Profit Projection - Only show for ACTIVE investments */}
              {investment.status === "ACTIVE" && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <Card className="border border-zinc-200/50 dark:border-zinc-700/50 shadow-xl bg-white dark:bg-zinc-900">
                    <CardHeader>
                      <CardTitle className="flex items-center text-zinc-900 dark:text-white">
                        <div
                          className={`w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center mr-3`}
                        >
                          <TrendingUp
                            className={`h-5 w-5 text-teal-500`}
                          />
                        </div>
                        Profit Projection
                      </CardTitle>
                      <CardDescription>
                        Estimated profits based on the current profit rate
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        {profitProjection.map((projection, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700"
                          >
                            <div className="flex items-center">
                              <div
                                className={`w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mr-4`}
                              >
                                <Calendar
                                  className={`h-6 w-6 text-emerald-500`}
                                />
                              </div>
                              <div>
                                <p className="font-semibold text-zinc-900 dark:text-white">
                                  {projection.days} Days
                                </p>
                                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                  Projected return
                                </p>
                              </div>
                            </div>

                            <div className="text-right">
                              <p
                                className={`font-bold text-emerald-600 dark:text-emerald-400`}
                              >
                                +{formatCurrency(projection.profit)}
                              </p>
                              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                Total: {formatCurrency(projection.total)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div
                        className={`mt-6 p-4 rounded-xl bg-teal-500/5 dark:bg-teal-500/10 border border-teal-500/20 dark:border-teal-500/20`}
                      >
                        <div className="flex items-start">
                          <Info
                            className={`h-5 w-5 text-teal-600 dark:text-teal-400 mr-3 mt-0.5 shrink-0`}
                          />
                          <p
                            className={`text-sm text-teal-600 dark:text-teal-400`}
                          >
                            Projections are estimates based on the current profit
                            rate. Actual returns may vary based on market
                            conditions.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Rejection/Cancellation Notice */}
              {(investment.status === "REJECTED" ||
                investment.status === "CANCELLED") && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <Card className="border-2 border-red-200 dark:border-red-500/30 shadow-xl bg-white dark:bg-zinc-900">
                    <CardHeader>
                      <CardTitle className="flex items-center text-red-600 dark:text-red-400">
                        <AlertCircle className="h-5 w-5 mr-2" />
                        Investment{" "}
                        {investment.status === "REJECTED"
                          ? "Rejection"
                          : "Cancellation"}{" "}
                        Notice
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-3">
                        <AlertCircle className="h-6 w-6 text-red-500 shrink-0 mt-1" />
                        <div>
                          <p className="text-zinc-900 dark:text-white mb-2">
                            {investment.status === "REJECTED"
                              ? "This investment has been rejected and will not generate any profits."
                              : "This investment has been cancelled and will not generate any profits."}
                          </p>
                          <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            {investment.status === "REJECTED"
                              ? "Your investment amount will be refunded to your account within 24-48 hours."
                              : "Your investment amount has been refunded to your account."}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Plan Image */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Card className="border border-zinc-200/50 dark:border-zinc-700/50 shadow-xl bg-white dark:bg-zinc-900 overflow-hidden">
                  <div className="h-48 relative">
                    <Image
                      src={plan?.image || "/img/placeholder.svg"}
                      alt={plan?.title || plan?.name || "Investment Plan"}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/40 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="text-white text-xl font-bold">
                        {plan?.title || plan?.name || "Investment Plan"}
                      </h3>
                      <p className="text-white/80 text-sm">
                        {plan?.profitPercentage
                          ? `${formatPercentage(plan.profitPercentage)} profit`
                          : "Investment Plan"}
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>

              {/* Quick Stats */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <Card className="border border-zinc-200/50 dark:border-zinc-700/50 shadow-xl bg-white dark:bg-zinc-900">
                  <CardHeader>
                    <CardTitle className="flex items-center text-zinc-900 dark:text-white text-base">
                      <Target
                        className={`h-4 w-4 mr-2 text-emerald-500`}
                      />
                      Quick Stats
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-zinc-500 dark:text-zinc-400">
                        Plan
                      </span>
                      <span className="font-medium text-zinc-900 dark:text-white">
                        {plan?.title || plan?.name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500 dark:text-zinc-400">
                        Status
                      </span>
                      {getStatusBadge(investment.status)}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500 dark:text-zinc-400">
                        ROI
                      </span>
                      <span
                        className={`font-medium text-emerald-600 dark:text-emerald-400`}
                      >
                        {investment.amount
                          ? formatPercentage(
                              ((investment.profit || 0) / investment.amount) *
                                100
                            )
                          : "0%"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Actions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <Link href="/forex/plan">
                  <Button
                    className={`w-full rounded-xl bg-linear-to-r from-emerald-500 via-teal-500 to-emerald-600 bg-size-[200%_100%] hover:bg-position-[100%_0] text-white font-semibold transition-all duration-300`}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    New Investment
                  </Button>
                </Link>
              </motion.div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
