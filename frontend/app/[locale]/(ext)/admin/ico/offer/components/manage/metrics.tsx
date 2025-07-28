"use client";

import { useAdminOfferStore } from "@/store/ico/admin/admin-offer-store";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  Users,
  Clock,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { JSX } from "react";
import { useTranslations } from "next-intl";

interface OfferingComparisonMetricsProps {
  expanded: boolean;
}

export function OfferingComparisonMetrics({
  expanded,
}: OfferingComparisonMetricsProps) {
  const { offerMetrics, platformMetrics } = useAdminOfferStore();

  // If either metric is not loaded, show a skeleton.
  if (!offerMetrics || !platformMetrics) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-2 w-full" />
          </div>
        ))}
      </div>
    );
  }

  // Calculate percentage difference between offering value and platform average.
  const calculateDifference = (metric: number, average: number): number => {
    if (average === 0) return 0;
    return ((metric - average) / average) * 100;
  };

  // Return an icon and color based on difference. For inverse metrics (like Time to Completion, where lower is better), inverse should be true.
  const getPerformanceIndicator = (difference: number, inverse = false) => {
    if ((!inverse && difference > 5) || (inverse && difference < -5)) {
      return {
        icon: <TrendingUp className="h-4 w-4 text-green-600" />,
        color: "text-green-600",
      };
    }
    if ((!inverse && difference < -5) || (inverse && difference > 5)) {
      return {
        icon: <TrendingDown className="h-4 w-4 text-red-600" />,
        color: "text-red-600",
      };
    }
    return {
      icon: <Minus className="h-4 w-4 text-yellow-600" />,
      color: "text-yellow-600",
    };
  };

  // Format the value based on type.
  const formatValue = (
    val: number,
    type: "number" | "currency" | "days" | "rate"
  ) => {
    if (type === "currency") return `$${val.toLocaleString()}`;
    if (type === "days") return `${val} days`;
    if (type === "rate") return `$${val.toLocaleString()}/day`;
    return val.toLocaleString();
  };

  // Render a single metric row comparing offering vs. platform average.
  const renderMetric = (
    title: string,
    offeringVal: number,
    platformVal: number,
    format: "number" | "currency" | "days" | "rate",
    tooltip: string,
    icon: JSX.Element,
    inverse = false
  ) => {
    const t = useTranslations("ext");
    const diff = calculateDifference(offeringVal, platformVal);
    const { icon: trendIcon, color } = getPerformanceIndicator(diff, inverse);

    return (
      <div className="flex flex-col space-y-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              {icon}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium">{title}</span>
              <span className="text-xs text-muted-foreground">
                {t("vs")}. {t("platform_average")}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-semibold">
              {formatValue(offeringVal, format)}
            </span>
            <span className={`text-xs flex items-center ${color}`}>
              {trendIcon}
              {diff > 0 ? "+" : ""}
              {diff.toFixed(1)}%
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Progress
            value={(offeringVal / (platformVal * 2)) * 100}
            className="h-1.5"
          />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger className="text-xs text-muted-foreground whitespace-nowrap">
                {t("avg")}
                {formatValue(platformVal, format)}
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs text-xs">{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {renderMetric(
          "Average Investment",
          offerMetrics.avgInvestment,
          platformMetrics.avgInvestment,
          "currency",
          "Average amount invested per participant",
          <DollarSign className="h-4 w-4 text-primary" />
        )}
        {renderMetric(
          "Daily Funding Rate",
          offerMetrics.fundingRate,
          platformMetrics.fundingRate,
          "rate",
          "Average amount raised per day",
          <TrendingUp className="h-4 w-4 text-primary" />
        )}
      </div>
      {expanded && (
        <>
          <Separator />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderMetric(
              "Largest Investment",
              offerMetrics.largestInvestment,
              platformMetrics.largestInvestment,
              "currency",
              "Largest single investment amount",
              <DollarSign className="h-4 w-4 text-primary" />
            )}
            {renderMetric(
              "Smallest Investment",
              offerMetrics.smallestInvestment,
              platformMetrics.smallestInvestment,
              "currency",
              "Smallest single investment amount",
              <DollarSign className="h-4 w-4 text-primary" />
            )}
          </div>
          <Separator />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderMetric(
              "Transactions per Investor",
              offerMetrics.transactionsPerInvestor,
              platformMetrics.transactionsPerInvestor,
              "number",
              "Average number of transactions per investor",
              <Users className="h-4 w-4 text-primary" />
            )}
            {renderMetric(
              "Time to Completion",
              offerMetrics.completionTime,
              platformMetrics.completionTime,
              "days",
              "Days from start to reaching funding target",
              <Clock className="h-4 w-4 text-primary" />,
              true // inverse because lower is better
            )}
          </div>
        </>
      )}
    </div>
  );
}
