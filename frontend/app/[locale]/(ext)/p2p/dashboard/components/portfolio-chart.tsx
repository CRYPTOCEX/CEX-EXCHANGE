"use client";

import { Link } from "@/i18n/routing";
import { BarChart4, LineChart, PlusCircle, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface PortfolioData {
  totalValue: number;
  changePercentage: number;
  change24h: number;
  return30d: number;
  chartData: { date?: string; value: number }[];
}

interface PortfolioChartProps {
  portfolio: PortfolioData | null;
  isLoading: boolean;
}

export function PortfolioChart({ portfolio, isLoading }: PortfolioChartProps) {
  const t = useTranslations("ext");
  if (isLoading) {
    return (
      <Card className="border-0 shadow-xl overflow-hidden">
        <CardContent className="pt-6">
          <PortfolioSkeleton />
        </CardContent>
      </Card>
    );
  }

  // Check if portfolio data is empty
  const hasPortfolioData =
    portfolio &&
    (portfolio.totalValue > 0 ||
      (portfolio.chartData &&
        portfolio.chartData.length > 0 &&
        portfolio.chartData.some((item) => item?.value > 0)));

  if (!hasPortfolioData) {
    return (
      <Card className="border-0 shadow-xl overflow-hidden">
        <CardContent className="p-0">
          <EmptyPortfolio />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-xl overflow-hidden">
      <CardHeader className="pb-0 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl">{t("your_portfolio")}</CardTitle>
            <CardDescription className="text-base mt-1">
              {t("your_portfolio_has_grown_by")}{" "}
              <span className="text-green-500 font-medium">
                {portfolio?.changePercentage || 0}%
              </span>{" "}
              {t("in_the_last_week")}
            </CardDescription>
          </div>
          <Tabs defaultValue="1w" className="w-[240px]">
            <TabsList className="grid grid-cols-4">
              <TabsTrigger value="1d">1D</TabsTrigger>
              <TabsTrigger value="1w">{t("1W")}</TabsTrigger>
              <TabsTrigger value="1m">{t("1M")}</TabsTrigger>
              <TabsTrigger value="1y">{t("1Y")}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <PortfolioChartVisualization chartData={portfolio?.chartData || []} />
      </CardContent>
      <CardFooter className="border-t py-5">
        <div className="grid grid-cols-3 w-full gap-6 text-center">
          {[
            {
              label: "Total Value",
              value: `${portfolio?.totalValue?.toLocaleString() || "0"}`,
            },
            {
              label: "24h Change",
              value: `${portfolio?.change24h > 0 ? "+" : ""}${portfolio?.change24h?.toLocaleString() || "0"}`,
              isPositive: portfolio?.change24h > 0,
              isNegative: portfolio?.change24h < 0,
            },
            {
              label: "30D Return",
              value: `${portfolio?.return30d > 0 ? "+" : ""}${portfolio?.return30d || "0"}%`,
              isPositive: portfolio?.return30d > 0,
              isNegative: portfolio?.return30d < 0,
            },
          ].map((stat, i) => (
            <div key={i} className="flex flex-col">
              <span className="text-base text-muted-foreground">
                {stat.label}
              </span>
              <span
                className={cn(
                  "font-bold text-xl mt-1",
                  stat.isPositive && "text-green-500",
                  stat.isNegative && "text-red-500"
                )}
              >
                {stat.value}
              </span>
            </div>
          ))}
        </div>
      </CardFooter>
    </Card>
  );
}

function PortfolioChartVisualization({ chartData }: { chartData: any[] }) {
  const t = useTranslations("ext");
  // Check if chart data is empty or invalid
  const hasValidData =
    chartData &&
    chartData.length > 1 &&
    chartData.some((item) => item?.value > 0);

  if (!hasValidData) {
    return (
      <div className="h-[300px] w-full flex flex-col items-center justify-center text-center p-6">
        <BarChart4 className="h-16 w-16 text-muted-foreground/40 mb-4" />
        <h3 className="text-lg font-medium mb-2">
          {t("no_portfolio_data_available")}
        </h3>
        <p className="text-muted-foreground max-w-md">
          {t("start_trading_or_chart_here")}.
        </p>
        <Link className="mt-6" href="/p2p/offer">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            {t("start_trading")}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="h-[300px] w-full relative overflow-hidden">
      {/* Chart SVG */}
      <svg
        className="w-full h-full"
        viewBox="0 0 400 200"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient
            id="portfolioGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="0%"
          >
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
          <linearGradient
            id="portfolioAreaGradient"
            x1="0%"
            y1="0%"
            x2="0%"
            y2="100%"
          >
            <stop offset="0%" stopColor="rgba(139, 92, 246, 0.3)" />
            <stop offset="100%" stopColor="rgba(59, 130, 246, 0)" />
          </linearGradient>
        </defs>

        {/* Area fill */}
        <path
          d="M0 180 C80 120, 180 160, 240 70 S 340 40, 400 20 V 200 H 0 Z"
          fill="url(#portfolioAreaGradient)"
        />

        {/* Line */}
        <path
          d="M0 180 C80 120, 180 160, 240 70 S 340 40, 400 20"
          fill="none"
          stroke="url(#portfolioGradient)"
          strokeWidth="3"
        />
      </svg>

      {/* Tooltip */}
      <div className="absolute right-12 top-5 p-3 bg-background/80 backdrop-blur-sm border border-border rounded-lg text-sm flex flex-col shadow-lg">
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">{t("Current")}</span>
          <span className="font-semibold">
            / $
            {chartData && chartData.length > 0
              ? chartData[chartData.length - 1]?.value?.toLocaleString() || "0"
              : "0"}
          </span>
        </div>
        <div className="flex items-center text-green-500 text-xs font-medium mt-1">
          <TrendingUp className="h-3 w-3 mr-1" />+
          {chartData && chartData.length > 0
            ? (
                (chartData[chartData.length - 1]?.value /
                  (chartData[0]?.value || 1) -
                  1) *
                100
              ).toFixed(1)
            : "0.0"}
          %
        </div>
      </div>
    </div>
  );
}

export function EmptyPortfolio() {
  const t = useTranslations("ext");
  return (
    <div className="flex flex-col items-center justify-center text-center p-8">
      <LineChart className="h-16 w-16 text-muted-foreground/40 mb-4" />
      <h3 className="text-xl font-medium mb-2">
        {t("your_portfolio_is_empty")}
      </h3>
      <p className="text-muted-foreground max-w-md mb-6">
        {t("start_by_adding_portfolio_grow")}.
      </p>
      <div className="flex gap-4">
        <Link href="/finance/wallet/deposit">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            {t("add_funds")}
          </Button>
        </Link>
        <Link href="/p2p/offer">
          <Button variant="outline">{t("start_trading")}</Button>
        </Link>
      </div>
    </div>
  );
}

export function PortfolioSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <Skeleton className="h-10 w-[240px]" />
      </div>
      <Skeleton className="h-[300px] w-full mt-4" />
      <div className="grid grid-cols-3 gap-6 pt-4 border-t">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col items-center">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-6 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
