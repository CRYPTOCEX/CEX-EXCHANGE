"use client";

import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Clock,
  Users,
  TrendingUp,
  Info,
  Coins,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useOfferStore } from "@/store/ico/offer/offer-store";
import { useFilterStore } from "@/store/ico/offer/filter-store";
import { formatCurrency } from "@/lib/ico/utils";
import { Link } from "@/i18n/routing";
import { useConfigStore } from "@/store/config";
import ActiveOffersLoading from "./active-offers-loading";
import { formatCrypto } from "@/utils/formatters";
import { useTranslations } from "next-intl";

export function ActiveTokenOfferings() {
  const t = useTranslations("ext");
  const {
    activeOfferings,
    isLoadingActive,
    activeOfferingsFetched,
    fetchActiveOfferings,
  } = useOfferStore();
  const { getQueryParams } = useFilterStore();

  useEffect(() => {
    fetchActiveOfferings(getQueryParams());
  }, [fetchActiveOfferings, getQueryParams]);

  if (isLoadingActive || !activeOfferingsFetched) {
    return <ActiveOffersLoading />;
  }

  if (activeOfferings.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium">
          {t("no_offerings_match_your_filters")}
        </h3>
        <p className="text-muted-foreground mt-2">
          {t("try_adjusting_your_search_or_filter_criteria")}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {activeOfferings.map((offering) => (
        <OfferingCard key={offering.id} offering={offering} />
      ))}
    </div>
  );
}

function OfferingCard({ offering }) {
  const t = useTranslations("ext");
  const { settings } = useConfigStore();
  const currency = offering.purchaseWalletCurrency || "";
  const progress = (offering.currentRaised / offering.targetAmount) * 100;
  const daysLeft = Math.ceil(
    (new Date(offering.endDate).getTime() - new Date().getTime()) /
      (1000 * 60 * 60 * 24)
  );

  const currentPhase = offering.currentPhase || {
    name: "Current Phase",
    tokenPrice: offering.tokenPrice,
    allocation: 0,
    remaining: 0,
    endsIn: daysLeft,
  };
  const nextPhase = offering.nextPhase;

  return (
    <Card className="overflow-hidden border-0 shadow-md transition-all duration-300 hover:shadow-lg">
      <div className="flex flex-col md:flex-row">
        <div className="md:w-1/3 bg-gradient-to-br from-primary/20 via-primary/10 to-background p-6 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/5 rounded-full -ml-12 -mb-12" />

          <div className="absolute top-4 right-4">
            <Badge
              variant={offering.status === "ACTIVE" ? "default" : "outline"}
              className="shadow-sm"
            >
              {offering.status === "ACTIVE" ? "Active" : offering.status}
            </Badge>
          </div>

          <div className="relative">
            <div className="flex items-center gap-4 mt-4">
              <div className="bg-primary/10 p-1 rounded-full">
                <img
                  src={offering.icon || "/img/placeholder.svg"}
                  alt={offering.name}
                  width={64}
                  height={64}
                  className="object-cover rounded-full"
                />
              </div>
              <div>
                <h3 className="text-2xl font-bold">{offering.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {offering.symbol}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 relative">
            <div className="flex items-center gap-1 text-sm font-medium text-muted-foreground mb-1">
              <Clock className="h-3.5 w-3.5" />
              <span>
                {t("current_phase")}
                {currentPhase.name}
              </span>
            </div>
            <p className="text-2xl font-bold">
              {formatCrypto(currentPhase.tokenPrice, currency)}
            </p>
            {nextPhase && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5" />
                {t("next")}
                {formatCrypto(nextPhase.tokenPrice, currency)}
                (
                {nextPhase.name}
                )
              </p>
            )}
          </div>
        </div>

        <div className="md:w-2/3 p-6">
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">
                  {t("funding_progress")}
                </span>
                <span className="text-sm font-medium">
                  {progress.toFixed(1)}%
                </span>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between mt-1">
                <span className="text-xs text-muted-foreground">
                  {formatCrypto(offering.currentRaised, currency)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatCrypto(offering.targetAmount, currency)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/30 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">
                  {t("time_remaining")}
                </p>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-primary" />
                  <p className="font-medium">
                    {currentPhase.endsIn}
                    {t("days")}
                  </p>
                </div>
              </div>
              <div className="bg-muted/30 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">
                  {t("Min")}. {t("Investment")}
                </p>
                <p className="font-medium">
                  {formatCrypto(settings["icoMinInvestmentAmount"], currency)}
                </p>
              </div>
              <div className="bg-muted/30 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">
                  {t("Participants")}
                </p>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4 text-primary" />
                  <p className="font-medium">{offering.participants}</p>
                </div>
              </div>
              <div className="bg-muted/30 p-3 rounded-lg">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="cursor-help">
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground mb-1">
                            {t("token_type")}
                          </p>
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </div>
                        <p className="font-medium">{t("Utility")}</p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="w-[200px] text-xs">
                        {t("utility_tokens_provide_demand_increases")}.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

            <p className="text-sm text-muted-foreground line-clamp-2">
              {offering.tokenDetail?.description}
            </p>

            <div className="pt-2">
              <Link href={`/ico/offer/${offering.id}`}>
                <Button className="w-full group">
                  {t("invest_now")}
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
