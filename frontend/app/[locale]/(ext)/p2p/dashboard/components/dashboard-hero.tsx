"use client";

import { Link } from "@/i18n/routing";
import { BellRing, Search, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";

interface DashboardHeroProps {
  name?: string;
  notifications?: number | any[];
  isLoading: boolean;
}

export function DashboardHero({ name, isLoading }: DashboardHeroProps) {
  const t = useTranslations("ext");
  if (isLoading) {
    return <HeroSkeleton />;
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-4xl font-bold tracking-tight">
        {t("welcome_back")}{" "}
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-violet-500">
          {name || "Trader"}
        </span>
      </h1>
      <p className="text-xl text-muted-foreground">
        {t("your_p2p_crypto_personalized_recommendations")}.
      </p>
      <div className="flex items-center gap-4 flex-wrap">
        <Link href="/p2p/offer">
          <Button className="gap-2 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white px-6 py-6 text-lg">
            <Zap className="h-5 w-5" />
            {t("start_trading")}
          </Button>
        </Link>
        <Link href="/p2p/guide">
          <Button variant="outline" className="gap-2 px-6 py-6 text-lg">
            <Search className="h-5 w-5" />
            {t("explore_features")}
          </Button>
        </Link>
      </div>
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Skeleton className="h-8 w-8 rounded-full mr-2" />
        <Skeleton className="h-6 w-48" />
      </div>
      <div>
        <Skeleton className="h-12 w-64 mb-3" />
        <Skeleton className="h-6 w-full max-w-xl mb-2" />
        <Skeleton className="h-6 w-full max-w-lg" />
      </div>
      <div className="flex gap-4 pt-2">
        <Skeleton className="h-14 w-36 rounded-md" />
        <Skeleton className="h-14 w-40 rounded-md" />
      </div>
    </div>
  );
}
