"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  Clock,
  Calendar,
  Target,
  CreditCard,
  Layers,
  ArrowRight,
} from "lucide-react";
import { useOfferStore } from "@/store/ico/offer/offer-store";
import { useFilterStore } from "@/store/ico/offer/filter-store";
import { formatDate } from "@/lib/ico/utils";
import { Link } from "@/i18n/routing";
import { CountdownTimer } from "../../components/countdown-timer";
import { useConfigStore } from "@/store/config";
import { formatCrypto } from "@/utils/formatters";
import { useTranslations } from "next-intl";

export function UpcomingTokenOfferings() {
  const t = useTranslations("ext");
  const { upcomingOfferings, isLoadingUpcoming, fetchUpcomingOfferings } =
    useOfferStore();
  const { settings } = useConfigStore();
  const { getQueryParams } = useFilterStore();
  const [notifiedOfferings, setNotifiedOfferings] = useState<string[]>([]);
  useEffect(() => {
    fetchUpcomingOfferings(getQueryParams());
  }, [fetchUpcomingOfferings, getQueryParams]);
  const toggleNotification = (id: string) => {
    setNotifiedOfferings((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };
  if (isLoadingUpcoming) {
    return (
      <>
        {[1, 2, 3].map((i) => (
          <Card key={i} className="w-full border-0 shadow-md">
            <CardHeader className="animate-pulse bg-muted h-24" />
            <CardContent className="animate-pulse space-y-2">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-4 bg-muted rounded w-1/2" />
              <div className="h-4 bg-muted rounded w-5/6" />
              <div className="h-4 bg-muted rounded w-2/3" />
            </CardContent>
            <CardFooter className="animate-pulse bg-muted h-16" />
          </Card>
        ))}
      </>
    );
  }
  if (upcomingOfferings.length === 0) {
    return (
      <div className="col-span-full text-center py-12">
        <h3 className="text-lg font-medium">
          {t("no_upcoming_offerings_match_your_filters")}
        </h3>
        <p className="text-muted-foreground mt-2">
          {t("try_adjusting_your_search_or_filter_criteria")}
        </p>
      </div>
    );
  }
  return (
    <>
      {upcomingOfferings.map((offering) => {
        const currency = offering.purchaseWalletCurrency || "";
        return (
          <Card
            key={offering.id}
            className="w-full border-0 shadow-md transition-all duration-300 hover:shadow-lg overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 z-0" />

            <CardHeader className="pb-3 relative">
              <div className="flex justify-between items-start">
                <Badge
                  variant="secondary"
                  className="bg-primary/10 hover:bg-primary/20 text-primary"
                >
                  {t("coming_soon")}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`h-8 w-8 ${notifiedOfferings.includes(offering.id) ? "text-primary" : ""}`}
                  onClick={() => toggleNotification(offering.id)}
                >
                  <Bell className="h-4 w-4" />
                  <span className="sr-only">Set reminder</span>
                </Button>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <div className="bg-primary/10 p-1 rounded-full">
                  <img
                    src={offering.icon || "/img/placeholder.svg"}
                    alt={offering.name}
                    width={64}
                    height={64}
                    className="object-cover rounded-full"
                  />
                </div>
                <CardTitle>{offering.name}</CardTitle>
              </div>
              <CardDescription>{offering.symbol}</CardDescription>
            </CardHeader>

            <CardContent className="pb-3 relative z-10">
              <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                <div className="bg-muted/30 p-2 rounded-lg flex flex-col">
                  <p className="text-xs text-muted-foreground mb-1 flex items-center">
                    <Calendar className="h-3 w-3 mr-1" />
                    {t("start_date")}
                  </p>
                  <p className="font-medium">
                    {formatDate(offering.startDate)}
                  </p>
                </div>
                <div className="bg-muted/30 p-2 rounded-lg flex flex-col">
                  <p className="text-xs text-muted-foreground mb-1 flex items-center">
                    <Target className="h-3 w-3 mr-1" />
                    {t("Target")}
                  </p>
                  <p className="font-medium">
                    {formatCrypto(offering.targetAmount, currency)}
                  </p>
                </div>
                <div className="bg-muted/30 p-2 rounded-lg flex flex-col">
                  <p className="text-xs text-muted-foreground mb-1 flex items-center">
                    <Layers className="h-3 w-3 mr-1" />
                    {t("initial_price")}
                  </p>
                  <p className="font-medium">
                    {formatCrypto(offering.tokenPrice, currency)}
                  </p>
                </div>
                <div className="bg-muted/30 p-2 rounded-lg flex flex-col">
                  <p className="text-xs text-muted-foreground mb-1 flex items-center">
                    <CreditCard className="h-3 w-3 mr-1" />
                    {t("Min")}. {t("Investment")}
                  </p>
                  <p className="font-medium">
                    {formatCrypto(settings["icoMinInvestmentAmount"], currency)}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 text-sm bg-primary/5 p-3 rounded-lg">
                <Clock className="h-4 w-4 text-primary" />
                <span className="text-primary font-medium">
                  {t("starts_in")}
                </span>
                <CountdownTimer targetDate={new Date(offering.startDate)} />
              </div>

              {offering.phases && offering.phases.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-medium mb-2">
                    {t("offering_phases")}
                  </p>
                  <div className="space-y-2">
                    {offering.phases.map((phase, index) => (
                      <div
                        key={index}
                        className="flex justify-between text-xs bg-muted/20 p-2 rounded"
                      >
                        <span>{phase.name}</span>
                        <span className="font-medium">
                          {formatCrypto(phase.tokenPrice, currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>

            <CardFooter className="relative z-10">
              <Link href={`/ico/offer/${offering.id}`} className="w-full">
                <Button variant="outline" className="w-full group">
                  {t("learn_more")}
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </CardFooter>
          </Card>
        );
      })}
    </>
  );
}
