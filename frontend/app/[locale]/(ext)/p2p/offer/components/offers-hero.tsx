"use client";

import { Link } from "@/i18n/routing";
import { Compass, Shield, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingOffers } from "./market-trends";
import { useP2PStore } from "@/store/p2p/p2p-store";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

interface OffersHeroProps {
  totalOffers: number;
  isLoadingP2PStats: boolean;
  formatOfferCount: (count: number) => string;
}

export function OffersHero({
  totalOffers,
  isLoadingP2PStats,
  formatOfferCount,
}: OffersHeroProps) {
  const t = useTranslations("ext");
  const { tradeOffers } = useP2PStore();
  const [hasOffers, setHasOffers] = useState(true);

  useEffect(() => {
    setHasOffers(tradeOffers && tradeOffers.length > 0);
  }, [tradeOffers]);

  return (
    <div className="relative overflow-hidden rounded-xl border bg-gradient-to-r from-primary/10 via-primary/5 to-background p-6 shadow-sm">
      <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl"></div>
      <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl"></div>

      <div className="relative z-10 grid gap-8 md:grid-cols-2">
        <div
          className={`space-y-4 ${!hasOffers ? "md:col-span-2 max-w-3xl mx-auto text-center" : ""}`}
        >
          <h1 className="text-3xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            {t("find_the")}{" "}
            <span className="text-primary">{t("perfect_offer")}</span>{" "}
            {t("for_your_crypto_needs")}
          </h1>
          <p className="text-xl text-muted-foreground max-w-[600px] mx-auto">
            {t("browse_through_hundreds_payment_options")}.
          </p>

          <div className="flex flex-wrap gap-3 pt-2 justify-center">
            <Link href="/p2p/guided-matching" className="gap-2">
              <Button size="lg">
                <Compass className="h-4 w-4" />
                {t("find_best_offers")}
              </Button>
            </Link>
            <Link href="/p2p/offer/create" className="gap-2">
              <Button size="lg" variant="outline">
                <Zap className="h-4 w-4" />
                {t("create_offer")}
              </Button>
            </Link>
          </div>

          <div className="flex flex-wrap gap-4 pt-2 justify-center">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm">{t("competitive_rates")}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Shield className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm">{t("secure_escrow")}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm">
                {isLoadingP2PStats ? (
                  <Skeleton className="h-4 w-16" />
                ) : (
                  `${formatOfferCount(totalOffers)}+ Offers`
                )}
              </span>
            </div>
          </div>
        </div>

        {hasOffers && (
          <div className="flex items-center justify-center">
            <TrendingOffers />
          </div>
        )}
      </div>
    </div>
  );
}
