import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/routing";
import { Compass, Shield, Users, Zap, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroSection } from "@/components/ui/hero-section";
import { useTranslations } from "next-intl";

export default function OffersLoading() {
  const t = useTranslations("ext_p2p");
  const tCommon = useTranslations("common");
  return (
    <div className="flex w-full flex-col min-h-screen bg-gradient-to-b from-background via-muted/10 to-background dark:from-zinc-950 dark:via-zinc-900/30 dark:to-zinc-950">
      {/* Hero Section - Show actual hero */}
      <HeroSection
        badge={{
          icon: <Sparkles className="h-3.5 w-3.5" />,
          text: "P2P Marketplace",
          gradient: `from-blue-500/10 to-violet-500/10`,
          iconColor: `text-blue-500`,
          textColor: `text-blue-600 dark:text-blue-400`,
        }}
        title={[
          { text: "Find the " },
          { text: "Perfect Offer", gradient: `from-blue-600 via-violet-500 to-blue-600` },
          { text: " for Your Crypto Needs" },
        ]}
        description={t("browse_through_hundreds_of_offers_from")}
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
        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-blue-500/10`}>
              <Zap className={`h-4 w-4 text-blue-500`} />
            </div>
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("competitive_rates")}</p>
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
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-blue-500/10`}>
              <Users className={`h-4 w-4 text-blue-500`} />
            </div>
            <div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{tCommon('loading')}</p>
            </div>
          </div>
        </div>
      </HeroSection>

      {/* Main Content Skeleton */}
      <main className="container mx-auto px-4 py-12 space-y-12">
        {/* Data Table Skeleton */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-10 w-48 rounded-lg" />
          </div>
          <div className="border border-zinc-200/50 dark:border-zinc-700/50 rounded-xl overflow-hidden">
            <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 border-b border-zinc-200/50 dark:border-zinc-700/50">
              <div className="grid grid-cols-5 gap-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-4 w-full" />
                ))}
              </div>
            </div>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-4 border-b border-zinc-200/50 dark:border-zinc-700/50 last:border-b-0">
                <div className="grid grid-cols-5 gap-4">
                  {[1, 2, 3, 4, 5].map((j) => (
                    <Skeleton key={j} className="h-4 w-full" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section Skeleton */}
        <div className="bg-zinc-100/80 dark:bg-zinc-800/50 rounded-2xl p-8 border border-zinc-200/50 dark:border-zinc-700/50">
          <div className="text-center space-y-4">
            <Skeleton className="h-8 w-64 mx-auto" />
            <Skeleton className="h-5 w-full max-w-lg mx-auto" />
            <Skeleton className="h-11 w-40 mx-auto rounded-xl" />
          </div>
        </div>
      </main>
    </div>
  );
}
