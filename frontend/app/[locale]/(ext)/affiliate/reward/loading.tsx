import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";

export default function AffiliateRewardsLoading() {
  const t = useTranslations("ext_affiliate");
  return (
    <div className="container mx-auto px-4 py-6 pt-20 md:px-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">
            {t("your_affiliate_rewards")}
          </h1>
          <p className="text-muted-foreground">
            {t("track_and_manage_your_earnings")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>

      <Skeleton className="h-[400px] w-full" />
    </div>
  );
}
