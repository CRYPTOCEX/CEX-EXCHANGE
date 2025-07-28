"use client";

import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Calendar,
  Users,
  DollarSign,
  BarChart3,
  Coins,
} from "lucide-react";
import { useOfferStore } from "@/store/ico/offer/offer-store";
import { useFilterStore } from "@/store/ico/offer/filter-store";
import { formatCurrency, formatDate } from "@/lib/ico/utils";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

export function CompletedOfferings() {
  const t = useTranslations("ext");
  const { completedOfferings, isLoadingCompleted, fetchCompletedOfferings } =
    useOfferStore();
  const { getQueryParams } = useFilterStore();
  useEffect(() => {
    fetchCompletedOfferings(getQueryParams());
  }, [fetchCompletedOfferings, getQueryParams]);
  if (isLoadingCompleted) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="w-full border-0 shadow-md">
            <div className="flex flex-col md:flex-row">
              <div className="md:w-1/3 animate-pulse bg-muted h-64 md:h-auto" />
              <div className="md:w-2/3 p-6">
                <div className="space-y-4">
                  <div className="h-6 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="h-16 bg-muted rounded" />
                    <div className="h-16 bg-muted rounded" />
                    <div className="h-16 bg-muted rounded" />
                    <div className="h-16 bg-muted rounded" />
                  </div>
                  <div className="h-8 bg-muted rounded w-full" />
                  <div className="flex gap-2">
                    <div className="h-10 bg-muted rounded w-1/2" />
                    <div className="h-10 bg-muted rounded w-1/2" />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }
  if (completedOfferings.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium">
          {t("no_completed_offerings_match_your_filters")}
        </h3>
        <p className="text-muted-foreground mt-2">
          {t("try_adjusting_your_search_or_filter_criteria")}
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {completedOfferings.map((offering) => {
        return (
          <Card
            key={offering.id}
            className="overflow-hidden border-0 shadow-md transition-all duration-300 hover:shadow-lg"
          >
            <div className="flex flex-col md:flex-row">
              <div className="md:w-1/3 bg-gradient-to-br from-muted/50 via-muted/30 to-background p-6 flex flex-col justify-between relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-muted/20 rounded-full -mr-16 -mt-16" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-muted/20 rounded-full -ml-12 -mb-12" />

                <div className="relative">
                  <Badge
                    variant={
                      offering.status === "SUCCESS" ? "default" : "destructive"
                    }
                    className={`${offering.status === "SUCCESS" ? "bg-green-500/10 hover:bg-green-500/20 text-green-500" : ""}`}
                  >
                    {offering.status === "SUCCESS" ? "Success" : "Failed"}
                  </Badge>
                  <div className="flex items-center gap-2 mt-4">
                    <div className="bg-primary/10 p-1 rounded-full">
                      <img
                        src={offering.icon || "/img/placeholder.svg"}
                        alt={offering.name}
                        width={64}
                        height={64}
                        className="object-cover rounded-full"
                      />
                    </div>
                    <h3 className="text-2xl font-bold">{offering.name}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {offering.symbol}
                  </p>
                </div>

                <div className="mt-4 relative">
                  <p className="text-sm font-medium">
                    {t("final_token_price")}
                  </p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(offering.tokenPrice)}
                  </p>
                </div>
              </div>

              <div className="md:w-2/3 p-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-muted/30 p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1 flex items-center">
                        <DollarSign className="h-3 w-3 mr-1" />
                        {t("total_raised")}
                      </p>
                      <p className="font-medium">
                        {formatCurrency(offering.currentRaised ?? 0)}
                      </p>
                    </div>
                    <div className="bg-muted/30 p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1 flex items-center">
                        <BarChart3 className="h-3 w-3 mr-1" />
                        {t("Target")}
                      </p>
                      <p className="font-medium">
                        {formatCurrency(offering.targetAmount)}
                      </p>
                    </div>
                    <div className="bg-muted/30 p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1 flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {t("completion_date")}
                      </p>
                      <p className="font-medium">
                        {formatDate(offering.endDate)}
                      </p>
                    </div>
                    <div className="bg-muted/30 p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1 flex items-center">
                        <Users className="h-3 w-3 mr-1" />
                        {t("Participants")}
                      </p>
                      <p className="font-medium">{offering.participants}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 bg-muted/30 p-3 rounded-lg">
                    <p className="text-sm font-medium">{t("current_price")}</p>
                    <p className="font-bold">
                      {formatCurrency(offering.currentPrice ?? 0)}
                    </p>

                    {offering.priceChange && offering.priceChange > 0 ? (
                      <Badge
                        variant="outline"
                        className="text-green-500 flex items-center gap-1 ml-auto"
                      >
                        <TrendingUp className="h-3 w-3" />+
                        {offering.priceChange}%
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-red-500 flex items-center gap-1 ml-auto"
                      >
                        <TrendingDown className="h-3 w-3" />
                        {offering.priceChange}%
                      </Badge>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Link href={`/ico/offer/${offering.id}`} className="flex-1">
                      <Button variant="outline" className="w-full">
                        {t("view_details")}
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
