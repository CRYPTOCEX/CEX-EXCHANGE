"use client";

import { Link } from "@/i18n/routing";
import { Compass, Shield, Users, Zap, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";
import { HeroSection } from "@/components/ui/hero-section";
import { StatsGroup } from "@/components/ui/stats-group";

interface OffersHeroProps {
  totalOffers: number;
  isLoadingP2PStats: boolean;
}

export function OffersHero({
  totalOffers,
  isLoadingP2PStats,
}: OffersHeroProps) {
  const t = useTranslations("ext_p2p");
  const tCommon = useTranslations("common");

  // Format offer count with commas
  const formatOfferCount = (count: number) => {
    return count ? count.toLocaleString() : "0";
  };

  return (
    <HeroSection
      badge={{
        icon: <Sparkles className="h-3.5 w-3.5" />,
        text: "P2P Marketplace",
        gradient: `from-blue-500/10 to-violet-500/10`,
        iconColor: `text-blue-500`,
        textColor: `text-blue-600 dark:text-blue-400`,
      }}
      title={[
        { text: t("find_the") + " " },
        { text: t("perfect_offer"), gradient: `from-blue-600 via-violet-500 to-blue-600` },
        { text: " " + t("for_your_crypto_needs") },
      ]}
      description={t("browse_through_hundreds_payment_options") + "."}
      paddingTop="pt-24"
      paddingBottom="pb-16"
      layout="split"
      background={{
        orbs: [
          {
            color: "#3b82f6",
            position: { top: "-10rem", right: "-10rem" },
            size: "20rem",
          },
          {
            color: "#8b5cf6",
            position: { bottom: "-5rem", left: "-5rem" },
            size: "15rem",
          },
        ],
      }}
      particles={{
        count: 6,
        type: "floating",
        colors: ["#3b82f6", "#8b5cf6"],
        size: 8,
      }}
      rightContent={
        <div className="flex flex-col gap-3 w-full sm:w-auto lg:mt-8">
          <Link href="/p2p/guided-matching">
            <Button size="lg" className={`w-full sm:w-48 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-600 text-white font-semibold rounded-xl shadow-lg`}>
              <Compass className="mr-2 h-5 w-5" />
              {t("find_best_offers")}
            </Button>
          </Link>
          <Link href="/p2p/offer/create">
            <Button size="lg" variant="outline" className={`w-full sm:w-48 border-2 border-blue-500/50 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 dark:hover:bg-blue-500/20 font-semibold rounded-xl shadow-lg`}>
              <Zap className="mr-2 h-5 w-5" />
              {tCommon("create_offer")}
            </Button>
          </Link>
        </div>
      }
    >
      <StatsGroup
        stats={[
          {
            icon: Zap,
            label: t("competitive_rates"),
            value: "",
            iconColor: `text-blue-500`,
            iconBgColor: `bg-blue-500/10`,
          },
          {
            icon: Shield,
            label: t("secure_escrow"),
            value: "",
            iconColor: `text-blue-500`,
            iconBgColor: `bg-blue-500/10`,
          },
          {
            icon: Users,
            label: isLoadingP2PStats ? "" : `${formatOfferCount(totalOffers)}+ Offers`,
            value: "",
            iconColor: `text-blue-500`,
            iconBgColor: `bg-blue-500/10`,
          },
        ]}
      />
    </HeroSection>
  );
}
