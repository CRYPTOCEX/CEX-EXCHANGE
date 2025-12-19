import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/routing";
import { Search, Zap, Sparkles, TrendingUp, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroSection } from "@/components/ui/hero-section";
import { useTranslations } from "next-intl";

export default function P2PDashboardLoading() {
  const t = useTranslations("ext_p2p");
  const tCommon = useTranslations("common");
  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-background via-muted/10 to-background dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950">
      {/* Hero Section - Show actual hero, no loading needed */}
      <HeroSection
        badge={{
          icon: <Sparkles className="h-3.5 w-3.5" />,
          text: "P2P Dashboard",
          gradient: `from-blue-500/10 to-violet-500/10`,
          iconColor: `text-blue-500`,
          textColor: `text-blue-600 dark:text-blue-400`,
        }}
        title={[
          { text: "Welcome Back, " },
          { text: "Trader", gradient: `from-blue-600 via-violet-500 to-blue-600` },
        ]}
        description={t("your_p2p_crypto_trading_dashboard_with")}
        paddingTop="pt-24"
        paddingBottom="pb-12"
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
            <Link href="/p2p/offer">
              <Button size="lg" className={`w-full sm:w-48 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-semibold rounded-xl shadow-lg`}>
                <Zap className="mr-2 h-5 w-5" />
                {tCommon("start_trading")}
              </Button>
            </Link>
            <Link href="/p2p/guide">
              <Button size="lg" variant="outline" className={`w-full sm:w-48 border-2 border-blue-500/50 text-blue-600 dark:text-blue-400 hover:bg-blue-500/5 dark:hover:bg-blue-500/10 font-semibold rounded-xl shadow-lg`}>
                <Search className="mr-2 h-5 w-5" />
                {t("explore_features")}
              </Button>
            </Link>
          </div>
        }
      >
        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-blue-500/10`}>
              <TrendingUp className={`h-4 w-4 text-blue-500`} />
            </div>
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{t('real_time_prices')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-blue-500/10`}>
              <Shield className={`h-4 w-4 text-blue-500`} />
            </div>
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("secure_escrow")}</p>
            </div>
          </div>
        </div>
      </HeroSection>

      {/* Stats Overview Skeleton */}
      <section className="py-12">
        <div className="container mx-auto">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-zinc-100/80 dark:bg-zinc-800/50 rounded-xl p-6 border border-zinc-200/50 dark:border-zinc-700/50"
              >
                <Skeleton className="h-8 w-24 mb-2 bg-zinc-200/50 dark:bg-zinc-700/50" />
                <Skeleton className="h-4 w-32 bg-zinc-200/50 dark:bg-zinc-700/50" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content Skeleton */}
      <div className="container mx-auto pb-12">
        <div className="space-y-12">
          {/* Portfolio Section */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <Skeleton className={`h-10 w-10 rounded-xl bg-blue-500/20`} />
              <Skeleton className="h-8 w-48 bg-zinc-200/50 dark:bg-zinc-700/50" />
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl p-6 border border-zinc-200/50 dark:border-zinc-700/50">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="space-y-4 shrink-0">
                  <Skeleton className="h-6 w-32 bg-zinc-200/50 dark:bg-zinc-700/50" />
                  <Skeleton className="h-10 w-40 bg-zinc-200/50 dark:bg-zinc-700/50" />
                  <Skeleton className="h-5 w-24 bg-zinc-200/50 dark:bg-zinc-700/50" />
                </div>
                <Skeleton className="h-64 w-full rounded-xl bg-zinc-200/50 dark:bg-zinc-700/50" />
              </div>
            </div>
          </div>

          {/* My Offers Section */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <Skeleton className={`h-9 w-9 rounded-xl bg-blue-500/20`} />
              <Skeleton className="h-7 w-32 bg-zinc-200/50 dark:bg-zinc-700/50" />
            </div>
            <div className="border border-zinc-200/50 dark:border-zinc-700/50 rounded-xl overflow-hidden">
              <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 border-b border-zinc-200/50 dark:border-zinc-700/50">
                <div className="grid grid-cols-5 gap-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-4 w-full bg-zinc-200/50 dark:bg-zinc-700/50" />
                  ))}
                </div>
              </div>
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 border-b border-zinc-200/50 dark:border-zinc-700/50 last:border-b-0">
                  <div className="grid grid-cols-5 gap-4">
                    {[1, 2, 3, 4, 5].map((j) => (
                      <Skeleton key={j} className="h-4 w-full bg-zinc-200/50 dark:bg-zinc-700/50" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Trading Activity Section */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <Skeleton className={`h-9 w-9 rounded-xl bg-blue-500/20`} />
              <Skeleton className="h-7 w-40 bg-zinc-200/50 dark:bg-zinc-700/50" />
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-zinc-50 dark:bg-zinc-900/50 rounded-xl p-4 border border-zinc-200/50 dark:border-zinc-700/50"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <Skeleton className="h-10 w-10 rounded-full bg-zinc-200/50 dark:bg-zinc-700/50" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-24 bg-zinc-200/50 dark:bg-zinc-700/50" />
                      <Skeleton className="h-3 w-16 bg-zinc-200/50 dark:bg-zinc-700/50" />
                    </div>
                    <Skeleton className="h-6 w-16 rounded-full bg-zinc-200/50 dark:bg-zinc-700/50" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-16 bg-zinc-200/50 dark:bg-zinc-700/50" />
                      <Skeleton className="h-4 w-24 bg-zinc-200/50 dark:bg-zinc-700/50" />
                    </div>
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-12 bg-zinc-200/50 dark:bg-zinc-700/50" />
                      <Skeleton className="h-4 w-20 bg-zinc-200/50 dark:bg-zinc-700/50" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
