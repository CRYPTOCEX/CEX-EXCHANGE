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
  const [chartData, setChartData] = useState<any>(null);
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

      // Fetch the investment from API
      const fetchedInvestment = await fetchInvestment(id);
      if (fetchedInvestment) {
        setInvestment(fetchedInvestment);

        // Use the nested plan and duration from API response
        const relatedPlan = fetchedInvestment.plan;
        const relatedDuration = fetchedInvestment.duration;
        setPlan(relatedPlan);
        setDuration(relatedDuration);

        // Generate mock chart data
        setChartData({
          labels: [
            "Day 1",
            "Day 5",
            "Day 10",
            "Day 15",
            "Day 20",
            "Day 25",
            "Day 30",
          ],
          datasets: [
            {
              label: "Investment Value",
              data: [
                fetchedInvestment.amount || 0,
                (fetchedInvestment.amount || 0) *
                  (1 + ((relatedPlan?.profitPercentage || 5) / 100) * 0.2),
                (fetchedInvestment.amount || 0) *
                  (1 + ((relatedPlan?.profitPercentage || 5) / 100) * 0.4),
                (fetchedInvestment.amount || 0) *
                  (1 + ((relatedPlan?.profitPercentage || 5) / 100) * 0.6),
                (fetchedInvestment.amount || 0) *
                  (1 + ((relatedPlan?.profitPercentage || 5) / 100) * 0.8),
                (fetchedInvestment.amount || 0) *
                  (1 + ((relatedPlan?.profitPercentage || 5) / 100) * 0.9),
                (fetchedInvestment.amount || 0) *
                  (1 + (relatedPlan?.profitPercentage || 5) / 100),
              ],
            },
          ],
        });

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
          <Badge className="bg-green-500 dark:bg-white dark:text-black">
            Active
          </Badge>
        );
      case "COMPLETED":
        return (
          <Badge className="bg-blue-500 dark:bg-white dark:text-black">
            Completed
          </Badge>
        );
      case "CANCELLED":
        return (
          <Badge className="bg-gray-500 dark:bg-white dark:text-black">
            Cancelled
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge className="bg-red-500 dark:bg-white dark:text-black">
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
          <CheckCircle className="h-5 w-5 text-green-500 dark:text-white" />
        );
      case "LOSS":
        return <XCircle className="h-5 w-5 text-red-500 dark:text-white" />;
      case "DRAW":
        return (
          <AlertCircle className="h-5 w-5 text-yellow-500 dark:text-white" />
        );
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
        : investment.endDate?.toISOString?.() || ""
    );
  };

  // Handle error state
  if (error) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-zinc-900">
        <main className="flex-1 container mx-auto px-4 py-8">
          <Card className="border-none shadow-md dark:bg-zinc-800 dark:text-white">
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">
                Error Loading Investment
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
              <Button
                onClick={() => window.location.reload()}
                className="bg-blue-600 hover:bg-blue-700 dark:bg-white dark:text-black"
              >
                Try Again
              </Button>
            </CardContent>
          </Card>
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
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-zinc-900">
      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Investment Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                {plan.title || plan.name}
                {getStatusBadge(investment.status)}
              </h1>
              <p className="text-gray-600 dark:text-white mt-2">
                Investment ID: {investment.id.substring(0, 8)}... • Created on{" "}
                {formatDate(investment.createdAt || "")}
              </p>
            </div>
          </div>
        </div>

        {/* Investment Summary */}
        <div className="grid md:grid-cols-3 gap-8">
          {/* Main Info */}
          <div className="md:col-span-2 space-y-6">
            {/* Status Card */}
            <Card className="border-none shadow-md overflow-hidden dark:bg-zinc-800 dark:text-white">
              <div className="border-b border-gray-100 dark:border-gray-700">
                <Progress value={progress} className="h-1 rounded-none" />
              </div>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                      Investment Status
                    </h3>
                    <p className="text-gray-600 dark:text-white text-sm">
                      {investment.status === "ACTIVE"
                        ? "Your investment is active and generating profits."
                        : investment.status === "COMPLETED"
                          ? "Your investment has been completed successfully."
                          : investment.status === "REJECTED"
                            ? "This investment has been rejected and will not proceed."
                            : investment.status === "CANCELLED"
                              ? "This investment has been cancelled."
                              : "Your investment is no longer active."}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    {investment.result && getResultIcon(investment.result)}
                    <span className="font-medium">
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
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-white mb-1">
                          Progress
                        </p>
                        <div className="flex items-center">
                          <Progress
                            value={progress}
                            className="h-2 w-40 mr-3"
                          />
                          <span className="text-sm font-medium">
                            {Math.round(progress)}%
                          </span>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm text-gray-600 dark:text-white mb-1">
                          Time Remaining
                        </p>
                        <p className="font-medium">
                          {remainingTime.isExpired
                            ? "Completing soon..."
                            : `${remainingTime.days}d ${remainingTime.hours}h ${remainingTime.minutes}m`}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-gray-600 dark:text-white mb-1">
                          End Date
                        </p>
                        <p className="font-medium">
                          {formatDate(investment.endDate || "")}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Details Card */}
            <Card className="border-none shadow-md dark:bg-zinc-800 dark:text-white">
              <CardHeader className="pb-2">
                <CardTitle>Investment Details</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-white mb-1">
                      Investment Amount
                    </p>
                    <p className="text-xl font-bold">
                      {formatCurrency(investment.amount || 0)}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 dark:text-white mb-1">
                      Profit
                    </p>
                    <p className="text-xl font-bold text-green-600 dark:text-white">
                      {formatCurrency(investment.profit || 0)}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 dark:text-white mb-1">
                      Total Return
                    </p>
                    <p className="text-xl font-bold">
                      {formatCurrency(
                        (investment.amount || 0) + (investment.profit || 0)
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 dark:text-white mb-1">
                      Profit Rate
                    </p>
                    <p className="font-medium">
                      {plan?.profitPercentage
                        ? formatPercentage(plan.profitPercentage)
                        : "N/A"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 dark:text-white mb-1">
                      Duration
                    </p>
                    <p className="font-medium">
                      {duration
                        ? formatDuration(duration.duration, duration.timeframe)
                        : "N/A"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 dark:text-white mb-1">
                      Currency
                    </p>
                    <p className="font-medium">{plan?.currency || "USD"}</p>
                  </div>
                </div>

                <Separator className="my-6 dark:border-gray-700" />

                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    Plan Information
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 dark:bg-zinc-800 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-white mb-1">
                        Plan Name
                      </p>
                      <p className="font-medium">
                        {plan?.title || plan?.name || "N/A"}
                      </p>
                    </div>

                    <div className="bg-gray-50 dark:bg-zinc-800 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-white mb-1">
                        Investment Status
                      </p>
                      <div className="flex items-center">
                        {getStatusBadge(investment.status)}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Profit Projection - Only show for ACTIVE investments */}
            {investment.status === "ACTIVE" && (
              <Card className="border-none shadow-md dark:bg-zinc-800 dark:text-white">
                <CardHeader className="pb-2">
                  <CardTitle>Profit Projection</CardTitle>
                  <CardDescription>
                    Estimated profits based on the current profit rate
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {profitProjection.map((projection, index) => {
                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center">
                            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-white dark:text-black flex items-center justify-center mr-3">
                              <Calendar className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium">
                                {projection.days} Days
                              </p>
                              <p className="text-sm text-gray-600 dark:text-white">
                                Projected return
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <p className="font-bold text-green-600 dark:text-white">
                              {formatCurrency(projection.profit)}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-white">
                              Total: {formatCurrency(projection.total)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-start">
                      <Info className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-600 dark:text-white">
                        Projections are estimates based on the current profit
                        rate. Actual returns may vary based on market
                        conditions.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Rejection/Cancellation Notice - Show for REJECTED/CANCELLED investments */}
            {(investment.status === "REJECTED" ||
              investment.status === "CANCELLED") && (
              <Card className="border-none shadow-md dark:bg-zinc-800 dark:text-white">
                <CardHeader className="pb-2">
                  <CardTitle>
                    Investment{" "}
                    {investment.status === "REJECTED"
                      ? "Rejection"
                      : "Cancellation"}{" "}
                    Notice
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="h-6 w-6 text-red-500 flex-shrink-0 mt-1" />
                    <div>
                      <p className="text-gray-900 dark:text-white mb-2">
                        {investment.status === "REJECTED"
                          ? "This investment has been rejected and will not generate any profits."
                          : "This investment has been cancelled and will not generate any profits."}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {investment.status === "REJECTED"
                          ? "Your investment amount will be refunded to your account within 24-48 hours."
                          : "Your investment amount has been refunded to your account."}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Plan Image */}
            <Card className="border-none shadow-md overflow-hidden dark:bg-zinc-800 dark:text-white">
              <div className="h-48 relative">
                <Image
                  src={
                    plan?.image ||
                    "/placeholder.svg?height=192&width=384&query=forex investment plan"
                  }
                  alt={plan?.title || plan?.name || "Investment Plan"}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
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
          </div>
        </div>
      </main>
    </div>
  );
}
