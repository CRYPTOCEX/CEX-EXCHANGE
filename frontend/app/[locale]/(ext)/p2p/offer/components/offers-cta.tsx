"use client";

import { Link } from "@/i18n/routing";
import { ArrowRight, Shield, TrendingUp, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslations } from "next-intl";

export function OffersCTA() {
  const t = useTranslations("ext");
  return (
    <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20 overflow-hidden relative mt-6">
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

      <CardContent className="p-6 md:p-8 relative z-10">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-center">
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-xl md:text-2xl font-bold mb-3">
              {t("create_your_own_trading_offer")}
            </h2>
            <p className="text-muted-foreground mb-4 text-sm md:text-base">
              {t("cant_find_what_and_price")}. {t("set_your_own_your_offer")}.
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 md:gap-4 justify-center md:justify-start">
              <div className="flex items-center gap-2 justify-center md:justify-start">
                <Shield className="h-4 w-4 md:h-5 md:w-5 text-primary flex-shrink-0" />
                <span className="text-xs md:text-sm">{t("secure_escrow_protection")}</span>
              </div>
              <div className="flex items-center gap-2 justify-center md:justify-start">
                <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-primary flex-shrink-0" />
                <span className="text-xs md:text-sm">{t("set_your_own_price")}</span>
              </div>
              <div className="flex items-center gap-2 justify-center md:justify-start">
                <Wallet className="h-4 w-4 md:h-5 md:w-5 text-primary flex-shrink-0" />
                <span className="text-xs md:text-sm">{t("multiple_payment_methods")}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 w-full sm:w-auto sm:min-w-[220px]">
            <Link href="/p2p/offer/create" className="w-full">
              <Button size="lg" className="w-full bg-primary hover:bg-primary/90 h-12 text-base font-semibold">
                {t("create_buy_offer")}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/p2p/offer/create" className="w-full">
              <Button size="lg" variant="outline" className="w-full h-12 text-base font-semibold">
                {t("create_sell_offer")}
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
