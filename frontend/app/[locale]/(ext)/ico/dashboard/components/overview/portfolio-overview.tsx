"use client";

import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePortfolioStore } from "@/store/ico/portfolio/portfolio-store";
import { formatCurrency } from "@/lib/ico/utils";
import { useTranslations } from "next-intl";

export function PortfolioOverview() {
  const t = useTranslations("ext");
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
    return <div>{t("no_portfolio_data_available")}.</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Card 1: Total Invested */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            {t("total_invested")}
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

      {/* Card 2: Pending Investment */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            {t("pending_investment")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">
            {formatCurrency(portfolio.pendingInvested)}
          </div>
          <p className="text-xs text-muted-foreground">
            {t("investments_awaiting_token_release")}
          </p>
        </CardContent>
      </Card>

      {/* Card 3: Pending Verification Investment */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            {t("pending_verification_investment")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">
            {formatCurrency(portfolio.pendingVerificationInvested)}
          </div>
          <p className="text-xs text-muted-foreground">
            {t("investments_awaiting_verification")}
          </p>
        </CardContent>
      </Card>

      {/* Card 4: Received Investment */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            {t("received_investment")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">
            {formatCurrency(portfolio.receivedInvested)}
          </div>
          <p className="text-xs text-muted-foreground">
            {t("investments_with_tokens_received")}
          </p>
        </CardContent>
      </Card>

      {/* Card 5: Rejected Investment */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            {t("rejected_investment")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">
            {formatCurrency(portfolio.rejectedInvested)}
          </div>
          <p className="text-xs text-muted-foreground">
            {t("investments_that_were_refunded")}
          </p>
        </CardContent>
      </Card>

      {/* Card 6: Current Value */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            {t("current_value")}
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
    </div>
  );
}
