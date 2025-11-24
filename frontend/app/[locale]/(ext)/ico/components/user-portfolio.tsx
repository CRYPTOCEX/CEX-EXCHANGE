"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePortfolioStore } from "@/store/ico/portfolio/portfolio-store";
import { formatCurrency } from "@/lib/ico/utils";
import { PortfolioPerformance } from "@/app/[locale]/(ext)/ico/components/portfolio-performance";
import { useTranslations } from "next-intl";

export function UserPortfolio() {
  const t = useTranslations("ext");
  const { portfolio, fetchPortfolio } = usePortfolioStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await fetchPortfolio();
      setIsLoading(false);
    };

    loadData();
  }, [fetchPortfolio]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="animate-pulse bg-muted h-6 w-32 rounded" />
          <CardDescription className="animate-pulse bg-muted h-4 w-48 rounded" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <div className="animate-pulse bg-muted h-4 w-24 rounded" />
                <div className="animate-pulse bg-muted h-6 w-32 rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate derived values
  const totalInvested = portfolio.totalInvested ?? 0;
  const currentValue = portfolio.currentValue ?? 0;
  const totalProfitLoss = currentValue - totalInvested;
  const roi =
    totalInvested > 0
      ? ((totalProfitLoss / totalInvested) * 100).toFixed(2)
      : "0.00";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("portfolio_overview")}</CardTitle>
        <CardDescription>
          {t("your_investment_summary_and_performance")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="summary">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="summary">{t("Summary")}</TabsTrigger>
            <TabsTrigger value="performance">{t("Performance")}</TabsTrigger>
          </TabsList>
          <TabsContent value="summary">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("total_invested")}
                </p>
                <p className="text-2xl font-bold">
                  {formatCurrency(totalInvested)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("current_value")}
                </p>
                <p className="text-2xl font-bold">
                  {formatCurrency(currentValue)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {t("total_profit_loss")}
                </p>
                <p
                  className={`text-2xl font-bold ${
                    totalProfitLoss >= 0 ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {totalProfitLoss >= 0 ? "+" : ""}
                  {formatCurrency(totalProfitLoss)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t("ROI")}</p>
                <p
                  className={`text-2xl font-bold ${
                    Number(roi) >= 0 ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {Number(roi) >= 0 ? "+" : ""}
                  {roi}%
                </p>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="performance">
            <PortfolioPerformance />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
