"use client";

import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePortfolioStore } from "@/store/ico/portfolio/portfolio-store";
import { formatCurrency, formatNumber, formatPercentage } from "@/lib/ico/utils";
import { useTranslations } from "next-intl";
import { TrendingUp, TrendingDown } from "lucide-react";

export function PortfolioOverview() {
  const t = useTranslations("ext_ico");
  const tExt = useTranslations("ext");
  const tCommon = useTranslations("common");
  const { portfolio, fetchPortfolio, error } = usePortfolioStore();

  // Trigger fetch on mount.
  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  if (error) {
    return (
      <div className="text-red-500">{t("failed_to_load_portfolio_data")}.</div>
    );
  }
  if (!portfolio) {
    return <div>{tExt("no_portfolio_data_available")}.</div>;
  }

  const isPositive = portfolio.totalProfitLoss >= 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: Total Invested */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            {tCommon("total_invested")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">
            {formatCurrency(portfolio.totalInvested)}
          </div>
          <p className="text-xs text-muted-foreground">
            {t("total_amount_invested_in_icos")}
          </p>
        </CardContent>
      </Card>

      {/* Card 2: Current Value */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            {tExt("current_value")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">
            {formatCurrency(portfolio.currentValue)}
          </div>
          <p className="text-xs text-muted-foreground">
            {t("market_value_of_received_tokens")}
          </p>
        </CardContent>
      </Card>

      {/* Card 3: Total Tokens */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            {t("total_tokens")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">
            {formatNumber(portfolio.totalTokens)}
          </div>
          <p className="text-xs text-muted-foreground">
            {t("tokens_held_across_offerings")}
          </p>
        </CardContent>
      </Card>

      {/* Card 4: Profit/Loss */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            {t("total_profit_loss")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold flex items-center gap-2 ${isPositive ? "text-green-500" : "text-red-500"}`}>
            {isPositive ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
            {formatCurrency(Math.abs(portfolio.totalProfitLoss))}
          </div>
          <p className={`text-xs ${isPositive ? "text-green-500" : "text-red-500"}`}>
            {formatPercentage(portfolio.profitLossPercentage)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
